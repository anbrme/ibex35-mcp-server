export interface DatabaseConfig {
  apiUrl: string;
  apiKey?: string;
}

export class DatabaseManager {
  private apiUrl: string;
  private apiKey?: string;

  constructor(config: DatabaseConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
  }

  private async fetchAPI(endpoint: string, params?: any): Promise<any> {
    try {
      let url = `${this.apiUrl}${endpoint}`;
      
      // Add query parameters for GET requests
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        if (searchParams.toString()) {
          url += `?${searchParams.toString()}`;
        }
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(`Authentication required. Please ensure your IBEX35_API_KEY is configured in your Claude MCP settings. Visit the setup guide for help.`);
        }
        if (response.status === 404) {
          throw new Error(`Data not found at ${endpoint}. This may indicate the requested resource doesn't exist or the API endpoint has changed.`);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}. Please check your connection and try again.`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error while accessing IBEX 35 data: ${error}. Please check your internet connection.`);
    }
  }

  // Company queries
  async getAllCompanies(): Promise<any[]> {
    const data = await this.fetchAPI('/api/companies');
    return data.data || [];
  }

  async getCompanyBySymbol(symbol: string): Promise<any> {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Company symbol is required. Please provide a stock symbol like "SAN.MC", "BBVA.MC", or a company name like "Santander".');
    }

    const companies = await this.getAllCompanies();
    
    // Try exact symbol match first (multiple possible symbol fields)
    let company = companies.find(comp => 
      comp.symbol === symbol ||
      comp.ticker === symbol ||
      comp.id === symbol ||
      comp.symbol?.toLowerCase() === symbol.toLowerCase() ||
      comp.ticker?.toLowerCase() === symbol.toLowerCase() ||
      comp.id?.toLowerCase() === symbol.toLowerCase()
    );
    
    // If no symbol match, try company name matching
    if (!company) {
      company = companies.find(comp => 
        comp.name?.toLowerCase() === symbol.toLowerCase() ||
        this.fuzzyMatch(symbol, comp.name || '')
      );
    }
    
    if (!company) {
      // Provide helpful suggestions
      const suggestions = companies
        .filter(comp => 
          comp.name?.toLowerCase().includes(symbol.toLowerCase().substring(0, 3)) ||
          comp.ticker?.toLowerCase().includes(symbol.toLowerCase()) ||
          comp.id?.toLowerCase().includes(symbol.toLowerCase())
        )
        .slice(0, 5)
        .map(comp => `${comp.name} (${comp.ticker || comp.id})`)
        .join(', ');
      
      throw new Error(`Company "${symbol}" not found. ${suggestions ? `Did you mean: ${suggestions}?` : 'Try symbols like SAN.MC, BBVA.MC, IBE.MC or names like Santander, BBVA, Iberdrola.'}`);
    }
    
    return company;
  }

  async getCompaniesBySector(sector: string): Promise<any[]> {
    if (!sector || typeof sector !== 'string') {
      throw new Error('Sector is required. Try sectors like "banking", "energy", "telecommunications", "textile", "steel", "aviation", or "infrastructure".');
    }

    const companies = await this.getAllCompanies();
    
    // First try exact and partial matches
    let matches = companies.filter(company => 
      company.sector && (
        company.sector.toLowerCase().includes(sector.toLowerCase()) ||
        company.sub_sector?.toLowerCase().includes(sector.toLowerCase())
      )
    );
    
    // If no matches, try fuzzy matching
    if (matches.length === 0) {
      matches = companies.filter(company => 
        company.sector && (
          this.fuzzyMatch(sector, company.sector) ||
          (company.sub_sector && this.fuzzyMatch(sector, company.sub_sector))
        )
      );
    }
    
    // If still no matches, provide suggestions
    if (matches.length === 0) {
      const uniqueSectors = [...new Set(companies
        .map(comp => comp.sector)
        .filter(Boolean)
      )];
      
      throw new Error(`No companies found in sector "${sector}". Available sectors: ${uniqueSectors.slice(0, 8).join(', ')}`);
    }
    
    return matches;
  }

  async getCompaniesWithPERatio(minPE?: number, maxPE?: number): Promise<any[]> {
    const companies = await this.getAllCompanies();
    return companies.filter(company => {
      const pe = company.price_to_earnings || company.pe_ratio;
      if (pe === null || pe === undefined) return false;
      
      if (minPE !== undefined && pe < minPE) return false;
      if (maxPE !== undefined && pe > maxPE) return false;
      return true;
    });
  }

  // Director and governance queries - using network endpoint
  async getCompanyDirectors(companyId: string): Promise<any[]> {
    const data = await this.fetchAPI('/api/network');
    const directors = data.directors || [];
    return directors.filter(director => director.company_id === companyId);
  }

  async getBoardInterlocks(): Promise<any[]> {
    const companies = await this.getAllCompanies();
    
    // Extract all directors from all companies
    const allDirectors = [];
    companies.forEach(company => {
      if (company.directors && Array.isArray(company.directors)) {
        company.directors.forEach(director => {
          allDirectors.push({
            ...director,
            company_name: company.name,
            company_symbol: company.ticker
          });
        });
      }
    });
    
    // Group directors by name and find interlocks
    const directorMap = new Map();
    allDirectors.forEach(director => {
      if (!directorMap.has(director.name)) {
        directorMap.set(director.name, []);
      }
      directorMap.get(director.name).push(director);
    });

    const interlocks = [];
    for (const [name, directorList] of directorMap.entries()) {
      if (directorList.length > 1) {
        interlocks.push({
          director_name: name,
          companies: directorList.map(d => d.company_name).join(', '),
          board_count: directorList.length,
          positions: directorList.map(d => `${d.company_name} (${d.position})`).join('; ')
        });
      }
    }

    return interlocks.sort((a, b) => b.board_count - a.board_count);
  }

  async getDirectorsByName(name: string): Promise<any[]> {
    const data = await this.fetchAPI('/api/network');
    const directors = data.directors || [];
    return directors.filter(director => 
      director.name && director.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  // Shareholder queries
  async getCompanyShareholders(companyId: string): Promise<any[]> {
    const data = await this.fetchAPI('/api/shareholder-positions');
    const shareholders = data.shareholderPositions || data.positions || [];
    
    // Find company by ID first to get symbol
    const companies = await this.getAllCompanies();
    const company = companies.find(c => c.id === companyId);
    if (!company) return [];

    return shareholders.filter(position => 
      position.company_symbol === company.symbol || 
      position.ticker === company.symbol
    );
  }

  async getTopShareholdersBySector(sector: string, limit: number = 10): Promise<any[]> {
    const companies = await this.getCompaniesBySector(sector);
    const data = await this.fetchAPI('/api/shareholder-positions');
    const shareholders = data.shareholderPositions || data.positions || [];
    
    const sectorSymbols = companies.map(c => c.symbol);
    const sectorShareholders = shareholders.filter(position =>
      sectorSymbols.includes(position.company_symbol || position.ticker)
    );

    return sectorShareholders
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
      .slice(0, limit);
  }

  async getShareholderOverlap(): Promise<any[]> {
    const data = await this.fetchAPI('/api/shareholder-positions');
    const shareholders = data.shareholderPositions || data.positions || [];
    
    // Group by shareholder name
    const shareholderMap = new Map();
    shareholders.forEach(position => {
      const name = position.shareholder_name || position.name;
      if (!name) return;
      
      if (!shareholderMap.has(name)) {
        shareholderMap.set(name, []);
      }
      shareholderMap.get(name).push(position);
    });

    const overlaps = [];
    for (const [name, positions] of shareholderMap.entries()) {
      if (positions.length > 1) {
        const companies = positions.map(p => p.company_symbol || p.ticker).filter(Boolean);
        const avgPercentage = positions.reduce((sum, p) => sum + (p.percentage || 0), 0) / positions.length;
        
        overlaps.push({
          shareholder_name: name,
          companies: companies.join(','),
          company_count: companies.length,
          avg_percentage: avgPercentage
        });
      }
    }

    return overlaps.sort((a, b) => b.company_count - a.company_count);
  }

  // Price and market data queries
  async getHistoricalPrices(companyId: string, days: number = 30): Promise<any[]> {
    // Find company symbol from ID
    const companies = await this.getAllCompanies();
    const company = companies.find(c => c.id === companyId);
    if (!company) return [];

    const data = await this.fetchAPI('/api/historical-prices/company', {
      symbol: company.symbol,
      days: days
    });
    
    return data.historicalData || [];
  }

  async getTopPerformers(days: number = 7, limit: number = 10): Promise<any[]> {
    const companies = await this.getAllCompanies();
    
    // Get recent performance data for each company
    const performances = [];
    for (const company of companies.slice(0, 20)) { // Limit to avoid too many requests
      try {
        const historical = await this.getHistoricalPrices(company.id, days);
        if (historical.length >= 2) {
          const recent = historical[0];
          const old = historical[historical.length - 1];
          const changePercent = ((recent.close - old.close) / old.close) * 100;
          
          performances.push({
            symbol: company.symbol,
            name: company.name,
            sector: company.sector,
            current_price: recent.close,
            period_change: changePercent
          });
        }
      } catch (error) {
        // Skip companies with no data
        continue;
      }
    }

    return performances
      .sort((a, b) => b.period_change - a.period_change)
      .slice(0, limit);
  }

  // News and sentiment queries
  async getRecentNews(companyId?: string, limit: number = 20): Promise<any[]> {
    if (companyId) {
      const companies = await this.getAllCompanies();
      const company = companies.find(c => c.id === companyId);
      if (!company) return [];
      
      const data = await this.fetchAPI('/api/news/company', {
        symbol: company.symbol,
        limit: limit
      });
      return data.news || [];
    } else {
      const data = await this.fetchAPI('/api/news', { limit: limit });
      return data.news || [];
    }
  }

  async getNewsBySentiment(sentiment: string, limit: number = 20): Promise<any[]> {
    // Fetch all recent news and filter by sentiment client-side
    const data = await this.fetchAPI('/api/news', { limit: 100 });
    const allNews = data.news || [];
    
    // Filter by sentiment
    const filteredNews = allNews.filter((article: any) => {
      if (!article.sentiment && !article.sentiment_score) return false;
      
      // Handle sentiment as string (positive, negative, neutral)
      if (typeof article.sentiment === 'string') {
        return article.sentiment.toLowerCase() === sentiment.toLowerCase();
      }
      
      // Handle sentiment as numeric score
      if (typeof article.sentiment_score === 'number') {
        const score = article.sentiment_score;
        switch (sentiment.toLowerCase()) {
          case 'positive':
            return score > 0.1;
          case 'negative':
            return score < -0.1;
          case 'neutral':
            return score >= -0.1 && score <= 0.1;
          default:
            return false;
        }
      }
      
      return false;
    });
    
    return filteredNews.slice(0, limit);
  }

  // Lobbying and transparency queries
  async getLobbyingMeetings(companyId?: string, limit: number = 20): Promise<any[]> {
    const data = await this.fetchAPI('/api/lobbying', { limit: limit });
    const meetings = data.meetings || data.lobbying || [];
    
    if (companyId) {
      const companies = await this.getAllCompanies();
      const company = companies.find(c => c.id === companyId);
      if (!company) return [];
      
      return meetings.filter(meeting => 
        meeting.organization_name && 
        meeting.organization_name.toLowerCase().includes(company.name.toLowerCase())
      );
    }
    
    return meetings;
  }

  async getMostActiveLobbyists(limit: number = 10): Promise<any[]> {
    const data = await this.fetchAPI('/api/lobbying');
    const meetings = data.meetings || data.lobbying || [];
    
    // Group by organization and count meetings
    const orgCounts = new Map();
    meetings.forEach(meeting => {
      const org = meeting.organization_name;
      if (!org) return;
      
      if (!orgCounts.has(org)) {
        orgCounts.set(org, {
          organization_name: org,
          meeting_count: 0,
          institutions: new Set(),
          spending: []
        });
      }
      
      const entry = orgCounts.get(org);
      entry.meeting_count++;
      if (meeting.eu_institution) entry.institutions.add(meeting.eu_institution);
      if (meeting.quarterly_spending) entry.spending.push(meeting.quarterly_spending);
    });

    return Array.from(orgCounts.values())
      .map(entry => ({
        ...entry,
        institutions: Array.from(entry.institutions).join(','),
        avg_spending: entry.spending.length > 0 ? 
          entry.spending.reduce((sum, val) => sum + val, 0) / entry.spending.length : null
      }))
      .sort((a, b) => b.meeting_count - a.meeting_count)
      .slice(0, limit);
  }

  // Weekly reports
  async getWeeklyReports(reportType?: string, limit: number = 10): Promise<any[]> {
    const data = await this.fetchAPI('/api/reports', { 
      type: reportType, 
      limit: limit 
    });
    return data.reports || [];
  }

  // ESG data - not available in current API, return empty array
  async getESGScores(companyId?: string): Promise<any[]> {
    return []; // ESG data not available in current worker API
  }

  // Custom query execution - not supported for Cloudflare D1 via API
  async executeCustomQuery(sql: string, params: any[] = []): Promise<any[]> {
    throw new Error('Custom SQL queries are not supported via the Cloudflare Worker API. Please use the specific endpoints available.');
  }

  // Helper function for fuzzy string matching
  private fuzzyMatch(search: string, target: string, threshold: number = 0.6): boolean {
    if (!search || !target) return false;
    
    search = search.toLowerCase();
    target = target.toLowerCase();
    
    // Exact match
    if (target.includes(search)) return true;
    
    // Simple Levenshtein distance approximation
    const maxLength = Math.max(search.length, target.length);
    const distance = this.levenshteinDistance(search, target);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= threshold;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Comprehensive search across all data types
  async comprehensiveSearch(query: string, limit: number = 20): Promise<any> {
    try {
      const results: any = {
        query: query,
        companies: [],
        directors: [],
        news: [],
        lobbying: [],
        suggestions: []
      };

      // Search companies
      try {
        const companies = await this.getAllCompanies();
        results.companies = companies.filter(company => 
          this.fuzzyMatch(query, company.name) ||
          this.fuzzyMatch(query, company.sector || '') ||
          this.fuzzyMatch(query, company.ticker || '') ||
          this.fuzzyMatch(query, company.id || '')
        ).slice(0, 5);
      } catch (error) {
        results.companies_error = `Failed to search companies: ${error}`;
      }

      // Search directors
      try {
        const directors = await this.getDirectorsByName(query);
        results.directors = directors.slice(0, 5);
      } catch (error) {
        results.directors_error = `Failed to search directors: ${error}`;
      }

      // Search news
      try {
        const news = await this.getRecentNews(undefined, 50);
        results.news = news.filter(article => 
          this.fuzzyMatch(query, article.title || '') ||
          this.fuzzyMatch(query, article.content || '') ||
          this.fuzzyMatch(query, article.company_name || '')
        ).slice(0, 5);
      } catch (error) {
        results.news_error = `Failed to search news: ${error}`;
      }

      // Search lobbying
      try {
        const lobbying = await this.getLobbyingMeetings(undefined, 50);
        results.lobbying = lobbying.filter(meeting => 
          this.fuzzyMatch(query, meeting.organization_name || '') ||
          this.fuzzyMatch(query, meeting.eu_institution || '')
        ).slice(0, 5);
      } catch (error) {
        results.lobbying_error = `Failed to search lobbying data: ${error}`;
      }

      // Generate suggestions for better queries
      results.suggestions = this.generateSearchSuggestions(query, results);

      return results;
    } catch (error) {
      throw new Error(`Comprehensive search failed: ${error}. Try being more specific with your search terms.`);
    }
  }

  private generateSearchSuggestions(query: string, results: any): string[] {
    const suggestions: string[] = [];
    
    // If no results found
    const totalResults = (results.companies?.length || 0) + 
                        (results.directors?.length || 0) + 
                        (results.news?.length || 0) + 
                        (results.lobbying?.length || 0);
    
    if (totalResults === 0) {
      suggestions.push("Try searching for a company name like 'Santander', 'BBVA', or 'Iberdrola'");
      suggestions.push("Try searching by sector like 'banking', 'energy', or 'telecommunications'");
      suggestions.push("Try searching for a director name or recent news topics");
      suggestions.push("Use stock symbols like 'SAN.MC', 'BBVA.MC', or 'IBE.MC'");
    } else if (totalResults < 3) {
      suggestions.push("Try broader search terms or check spelling");
      suggestions.push("Use partial company names (e.g., 'Telefon' instead of 'Telefónica')");
    }
    
    // Suggest specific tools based on query patterns
    if (query.match(/\b(sentiment|news|article)\b/i)) {
      suggestions.push("Use 'get_news_by_sentiment' for sentiment analysis");
      suggestions.push("Use 'get_recent_news' for latest company news");
    }
    
    if (query.match(/\b(director|board|governance)\b/i)) {
      suggestions.push("Use 'get_board_interlocks' to find director connections");
      suggestions.push("Use 'get_company_directors' for specific company boards");
    }
    
    if (query.match(/\b(shareholder|investor|ownership)\b/i)) {
      suggestions.push("Use 'get_shareholder_overlap' for investor connections");
      suggestions.push("Use 'get_company_shareholders' for ownership details");
    }
    
    return suggestions;
  }

  // Smart company lookup with fuzzy matching
  async smartCompanyLookup(query: string): Promise<any> {
    try {
      const companies = await this.getAllCompanies();
      
      // Try exact matches first
      let matches = companies.filter(company => 
        company.ticker?.toLowerCase() === query.toLowerCase() ||
        company.id?.toLowerCase() === query.toLowerCase() ||
        company.name?.toLowerCase() === query.toLowerCase()
      );
      
      // If no exact matches, try fuzzy matching
      if (matches.length === 0) {
        matches = companies.filter(company => 
          this.fuzzyMatch(query, company.name) ||
          this.fuzzyMatch(query, company.ticker || '') ||
          this.fuzzyMatch(query, company.sector || '')
        );
      }
      
      if (matches.length === 0) {
        return {
          found: false,
          suggestions: [
            "Try these company names: Santander, BBVA, Iberdrola, Telefónica, Inditex",
            "Try these stock symbols: SAN.MC, BBVA.MC, IBE.MC, TEF.MC, ITX.MC",
            "Try these sectors: Banking, Energy, Telecommunications, Textile"
          ]
        };
      }
      
      if (matches.length === 1) {
        return {
          found: true,
          company: matches[0],
          exactMatch: true
        };
      }
      
      return {
        found: true,
        companies: matches,
        exactMatch: false,
        message: `Found ${matches.length} companies matching "${query}". Please be more specific.`
      };
    } catch (error) {
      throw new Error(`Company lookup failed: ${error}. Please check your spelling and try again.`);
    }
  }

  // Query interpreter to help users formulate better queries
  async interpretQuery(userQuery: string): Promise<any> {
    const query = userQuery.toLowerCase();
    const interpretation: any = {
      original_query: userQuery,
      suggested_tools: [],
      parameters: {},
      confidence: 'medium'
    };
    
    // Analyze query patterns
    if (query.match(/\b(all companies|list companies|companies)\b/)) {
      interpretation.suggested_tools.push({
        tool: 'get_all_companies',
        reason: 'Query asks for company listings',
        confidence: 'high'
      });
    }
    
    if (query.match(/\b(news|article|sentiment)\b/)) {
      interpretation.suggested_tools.push({
        tool: 'get_recent_news',
        reason: 'Query mentions news or articles'
      });
      
      if (query.match(/\b(positive|negative|neutral|sentiment)\b/)) {
        interpretation.suggested_tools.push({
          tool: 'get_news_by_sentiment',
          reason: 'Query specifically mentions sentiment',
          confidence: 'high'
        });
        
        const sentimentMatch = query.match(/\b(positive|negative|neutral)\b/);
        if (sentimentMatch) {
          interpretation.parameters.sentiment = sentimentMatch[1];
        }
      }
    }
    
    if (query.match(/\b(director|board|governance|CEO|chairman)\b/)) {
      interpretation.suggested_tools.push({
        tool: 'get_board_interlocks',
        reason: 'Query mentions directors or governance'
      });
      
      if (query.match(/\b(connections|interlocks|multiple boards)\b/)) {
        interpretation.confidence = 'high';
      }
    }
    
    if (query.match(/\b(shareholder|investor|ownership|stake)\b/)) {
      interpretation.suggested_tools.push({
        tool: 'get_shareholder_overlap',
        reason: 'Query mentions shareholders or ownership'
      });
    }
    
    if (query.match(/\b(lobbying|EU|Brussels|meetings)\b/)) {
      interpretation.suggested_tools.push({
        tool: 'get_lobbying_meetings',
        reason: 'Query mentions lobbying or EU activities'
      });
    }
    
    if (query.match(/\b(sector|industry|banking|energy|telecom)\b/)) {
      interpretation.suggested_tools.push({
        tool: 'get_companies_by_sector',
        reason: 'Query mentions sectors or industries'
      });
      
      const sectorMatch = query.match(/\b(banking|energy|telecom|telecommunication|textile|steel|aviation|infrastructure|tourism)\b/);
      if (sectorMatch) {
        interpretation.parameters.sector = sectorMatch[1];
      }
    }
    
    // Extract potential company names
    const companyPatterns = [
      /\b(santander|san\.mc)\b/i,
      /\b(bbva|bbva\.mc)\b/i,
      /\b(iberdrola|ibe\.mc)\b/i,
      /\b(telefonica|tef\.mc)\b/i,
      /\b(inditex|itx\.mc)\b/i
    ];
    
    for (const pattern of companyPatterns) {
      if (query.match(pattern)) {
        interpretation.suggested_tools.push({
          tool: 'get_company_by_symbol',
          reason: 'Query mentions a specific company',
          confidence: 'high'
        });
        break;
      }
    }
    
    // If no specific tools identified, suggest comprehensive search
    if (interpretation.suggested_tools.length === 0) {
      interpretation.suggested_tools.push({
        tool: 'comprehensive_search',
        reason: 'Query is general - comprehensive search recommended',
        confidence: 'medium'
      });
    }
    
    return interpretation;
  }

  close(): void {
    // No cleanup needed for HTTP API connections
  }
}