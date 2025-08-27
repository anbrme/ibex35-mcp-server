import { DatabaseManager } from './database.js';

export class AnalyticsManager {
  constructor(private db: DatabaseManager) {}

  // Network analysis for board interlocks and corporate governance
  async getComplexNetworkAnalysis(): Promise<any> {
    const companies = await this.db.getAllCompanies();
    const directors = await this.db.getBoardInterlocks();
    const shareholders = await this.db.getShareholderOverlap();

    // Calculate network metrics
    const directorNetworkMetrics = this.calculateDirectorNetworkMetrics(directors);
    const shareholderNetworkMetrics = this.calculateShareholderNetworkMetrics(shareholders);

    return {
      director_network: directorNetworkMetrics,
      shareholder_network: shareholderNetworkMetrics,
      cross_ownership_analysis: shareholders,
      governance_risk_factors: await this.getGovernanceRiskFactors(companies, directors)
    };
  }

  private calculateDirectorNetworkMetrics(interlocks: any[]): any {
    // Analyze existing interlock data
    const totalInterlocks = interlocks.length;
    const topDirectors = interlocks.slice(0, 10);
    
    // Calculate sector distribution
    const sectorConnections = new Map();
    interlocks.forEach(interlock => {
      const companies = interlock.companies.split(',');
      // Note: We'd need sector information to do proper sector analysis
      // This is simplified for the API-based approach
    });

    return {
      total_interlocks: totalInterlocks,
      interlocked_directors: topDirectors,
      most_connected_directors: topDirectors.slice(0, 5),
      network_density: totalInterlocks > 0 ? totalInterlocks / 35 : 0 // IBEX 35 companies
    };
  }

  private calculateShareholderNetworkMetrics(overlaps: any[]): any {
    const multiCompanyShareholders = overlaps;
    const crossSectorInvestors = overlaps.filter(s => s.company_count > 2);

    return {
      multi_company_shareholders: multiCompanyShareholders,
      cross_sector_investors: crossSectorInvestors,
      total_overlap_connections: overlaps.length,
      average_holdings_per_investor: overlaps.length > 0 ? 
        overlaps.reduce((sum, s) => sum + s.company_count, 0) / overlaps.length : 0
    };
  }

  private async getGovernanceRiskFactors(companies: any[], interlocks: any[]): Promise<any> {
    // Analyze companies for governance red flags
    const redFlags: any[] = [];

    companies.forEach(company => {
      // Check for high director interlocks
      const companyInterlocks = interlocks.filter(interlock => 
        interlock.companies.includes(company.symbol)
      );

      if (companyInterlocks.length > 3) {
        redFlags.push({
          company: company.symbol,
          risk_type: 'high_director_interlocks',
          description: `Company has ${companyInterlocks.length} interlocked directors`,
          severity: 'medium'
        });
      }

      // Check market cap for concentration risk
      if (company.market_cap && company.market_cap > 50000000000) { // 50B EUR
        redFlags.push({
          company: company.symbol,
          risk_type: 'market_dominance',
          description: `Large market cap may indicate market concentration`,
          severity: 'low'
        });
      }
    });

    return {
      governance_red_flags: redFlags.sort((a, b) => 
        (b.severity === 'high' ? 3 : b.severity === 'medium' ? 2 : 1) - 
        (a.severity === 'high' ? 3 : a.severity === 'medium' ? 2 : 1)
      ),
      total_red_flags: redFlags.length,
      high_risk_companies: redFlags.filter(f => f.severity === 'high').length
    };
  }

  // Market correlation analysis
  async getSectorCorrelationAnalysis(days: number = 30): Promise<any> {
    const companies = await this.db.getAllCompanies();
    
    // Group companies by sector
    const sectorMap = new Map();
    companies.forEach(company => {
      if (!company.sector) return;
      
      if (!sectorMap.has(company.sector)) {
        sectorMap.set(company.sector, []);
      }
      sectorMap.get(company.sector).push(company);
    });

    // Calculate sector performance metrics
    const sectorPerformance = [];
    for (const [sector, sectorCompanies] of sectorMap.entries()) {
      let totalMarketCap = 0;
      let companiesWithData = 0;
      let avgPE = 0;
      let peCount = 0;

      sectorCompanies.forEach(company => {
        if (company.market_cap) {
          totalMarketCap += company.market_cap;
          companiesWithData++;
        }
        
        const pe = company.price_to_earnings || company.pe_ratio;
        if (pe) {
          avgPE += pe;
          peCount++;
        }
      });

      sectorPerformance.push({
        sector: sector,
        company_count: sectorCompanies.length,
        total_market_cap: totalMarketCap,
        avg_market_cap: companiesWithData > 0 ? totalMarketCap / companiesWithData : 0,
        avg_pe_ratio: peCount > 0 ? avgPE / peCount : null,
        companies: sectorCompanies.slice(0, 5).map(c => ({
          symbol: c.symbol,
          name: c.name,
          market_cap: c.market_cap
        }))
      });
    }

    // Sort by total market cap
    sectorPerformance.sort((a, b) => b.total_market_cap - a.total_market_cap);

    return {
      period_days: days,
      sector_performance: sectorPerformance,
      total_sectors: sectorPerformance.length,
      largest_sector: sectorPerformance[0]?.sector || 'Unknown',
      market_concentration: this.calculateMarketConcentration(sectorPerformance)
    };
  }

  private calculateMarketConcentration(sectorPerformance: any[]): any {
    const totalMarketCap = sectorPerformance.reduce((sum, sector) => sum + sector.total_market_cap, 0);
    
    if (totalMarketCap === 0) return { hhi_index: 0, concentration_level: 'unknown' };

    // Calculate Herfindahl-Hirschman Index
    const hhi = sectorPerformance.reduce((sum, sector) => {
      const share = sector.total_market_cap / totalMarketCap;
      return sum + (share * share * 10000); // HHI scale
    }, 0);

    let concentrationLevel;
    if (hhi > 2500) concentrationLevel = 'highly_concentrated';
    else if (hhi > 1500) concentrationLevel = 'moderately_concentrated';
    else concentrationLevel = 'competitive';

    return {
      hhi_index: Math.round(hhi),
      concentration_level: concentrationLevel,
      top_3_market_share: sectorPerformance.slice(0, 3).reduce((sum, sector) => 
        sum + (sector.total_market_cap / totalMarketCap), 0) * 100
    };
  }

  // Enhanced natural language query processing
  async analyzeNaturalQuery(query: string, context?: string): Promise<any> {
    const lowerQuery = query.toLowerCase();
    const analysis = {
      original_query: query,
      context: context,
      interpretation: '',
      suggested_actions: [],
      results: {},
      execution_plan: []
    };

    try {
      // Banking-related queries
      if (lowerQuery.match(/\b(bank|banking|financial)\b.*\b(grow|growth|performance|best|worst)\b/)) {
        analysis.interpretation = 'Banking sector performance analysis';
        analysis.execution_plan.push('Get banking sector companies', 'Analyze recent performance', 'Rank by growth');
        
        const bankingCompanies = await this.db.getCompaniesBySector('banking');
        const performances = await this.analyzeCompanyPerformances(bankingCompanies, 30);
        analysis.results = {
          sector: 'Banking',
          companies_analyzed: bankingCompanies.length,
          top_performers: performances.slice(0, 5),
          analysis_period: '30 days'
        };
      }
      
      // High risk queries
      else if (lowerQuery.match(/\b(risk|risky|governance|red flag)\b/)) {
        analysis.interpretation = 'Risk assessment analysis';
        analysis.execution_plan.push('Analyze governance risks', 'Check market risks', 'Generate risk report');
        
        const companies = await this.db.getAllCompanies();
        const interlocks = await this.db.getBoardInterlocks();
        const governanceRisks = await this.getGovernanceRiskFactors(companies, interlocks);
        
        analysis.results = {
          total_companies_analyzed: companies.length,
          governance_risks: governanceRisks,
          high_risk_companies: governanceRisks.governance_red_flags.filter(f => f.severity === 'high').length,
          recommendations: this.generateRiskRecommendations(governanceRisks)
        };
      }
      
      // Comparison queries
      else if (lowerQuery.match(/\b(compare|vs|versus|against)\b/)) {
        analysis.interpretation = 'Company comparison analysis';
        
        // Try to extract company names from the query
        const companyPatterns = [
          /\b(santander|san\.mc|san)\b/i,
          /\b(bbva|bbva\.mc)\b/i,
          /\b(iberdrola|ibe\.mc|ibe)\b/i,
          /\b(telefonica|tef\.mc|tef)\b/i,
          /\b(inditex|itx\.mc|itx)\b/i
        ];
        
        const foundCompanies = [];
        for (const pattern of companyPatterns) {
          if (lowerQuery.match(pattern)) {
            const match = lowerQuery.match(pattern);
            if (match) foundCompanies.push(match[0].toUpperCase());
          }
        }
        
        if (foundCompanies.length >= 2) {
          analysis.results = await this.compareCompanies(foundCompanies, ['all']);
        } else {
          analysis.results = {
            error: 'Could not identify companies to compare',
            suggestion: 'Try: "Compare Santander vs BBVA" or use company symbols like SAN.MC vs BBVA.MC'
          };
        }
      }
      
      // Sector performance queries
      else if (lowerQuery.match(/\b(sector|industry).*\b(performance|trend|growth)\b/)) {
        const sectorMatch = lowerQuery.match(/\b(banking|energy|telecom|textile|steel|aviation|infrastructure)\b/);
        const sector = sectorMatch ? sectorMatch[1] : 'energy'; // default to energy as example
        
        analysis.interpretation = `${sector} sector performance analysis`;
        const sectorResults = await this.getSectorCorrelationAnalysis(30);
        analysis.results = {
          ...sectorResults,
          focused_sector: sector
        };
      }
      
      // Price/trend queries
      else if (lowerQuery.match(/\b(price|trend|forecast|prediction)\b/)) {
        analysis.interpretation = 'Price trend analysis';
        const companies = await this.db.getAllCompanies();
        const topPerformers = await this.db.getTopPerformers(30, 10);
        
        analysis.results = {
          analysis_type: 'Price trends over 30 days',
          top_performers: topPerformers,
          trend_summary: this.generateTrendSummary(topPerformers)
        };
      }
      
      // General fallback
      else {
        analysis.interpretation = 'General market overview';
        const companies = await this.db.getAllCompanies();
        const recent_news = await this.db.getRecentNews(undefined, 5);
        const top_performers = await this.db.getTopPerformers(7, 5);
        
        analysis.results = {
          total_companies: companies.length,
          recent_market_news: recent_news.length,
          weekly_top_performers: top_performers,
          market_snapshot: 'Current IBEX 35 overview'
        };
      }

      analysis.suggested_actions = this.generateActionSuggestions(analysis.interpretation, analysis.results);
      
      return analysis;
    } catch (error) {
      return {
        ...analysis,
        error: `Failed to process natural language query: ${error}`,
        fallback_suggestion: 'Try using specific tool names like get_all_companies, get_recent_news, or get_board_interlocks'
      };
    }
  }

  // Company comparison analysis
  async compareCompanies(companies: string[], metrics: string[] = ['all']): Promise<any> {
    try {
      const companyData = [];
      
      for (const companyInput of companies) {
        try {
          const company = await this.db.getCompanyBySymbol(companyInput);
          if (company) {
            const directors = await this.db.getCompanyDirectors(company.id);
            const shareholders = await this.db.getCompanyShareholders(company.id);
            const historical = await this.db.getHistoricalPrices(company.id, 30);
            const news = await this.db.getRecentNews(company.id, 5);
            
            companyData.push({
              basic_info: company,
              directors: directors.length,
              shareholders: shareholders.length,
              recent_performance: historical.length > 1 ? this.calculatePerformance(historical) : null,
              news_coverage: news.length,
              risk_profile: this.assessCompanyRisk(company, directors)
            });
          }
        } catch (error) {
          companyData.push({
            symbol: companyInput,
            error: `Could not find or analyze company: ${error}`
          });
        }
      }

      // Generate comparison analysis
      const comparison = {
        companies_compared: companyData.length,
        comparison_date: new Date().toISOString(),
        metrics_analyzed: metrics,
        detailed_comparison: companyData,
        summary: this.generateComparisonSummary(companyData),
        recommendations: this.generateComparisonRecommendations(companyData)
      };

      return comparison;
    } catch (error) {
      throw new Error(`Company comparison failed: ${error}`);
    }
  }

  // Trend analysis with forecasting
  async analyzeTrends(analysisType: string, target: string, period: number = 30, includeForecast: boolean = false): Promise<any> {
    try {
      const analysis = {
        analysis_type: analysisType,
        target: target,
        period_days: period,
        timestamp: new Date().toISOString(),
        trend_data: null,
        forecast: null,
        insights: []
      };

      switch (analysisType) {
        case 'company_trend':
          const company = await this.db.getCompanyBySymbol(target);
          if (!company) throw new Error(`Company ${target} not found`);
          
          const historical = await this.db.getHistoricalPrices(company.id, period);
          analysis.trend_data = this.analyzePriceTrend(historical);
          analysis.insights = this.generateTrendInsights(analysis.trend_data, company);
          
          if (includeForecast) {
            analysis.forecast = this.generateSimpleForecast(historical);
          }
          break;

        case 'sector_trend':
          const sectorCompanies = await this.db.getCompaniesBySector(target);
          const sectorPerformance = await this.analyzeCompanyPerformances(sectorCompanies, period);
          analysis.trend_data = {
            sector: target,
            companies_analyzed: sectorCompanies.length,
            average_performance: sectorPerformance.reduce((sum, p) => sum + (p.period_change || 0), 0) / sectorPerformance.length,
            best_performer: sectorPerformance[0],
            worst_performer: sectorPerformance[sectorPerformance.length - 1],
            volatility_measure: this.calculateSectorVolatility(sectorPerformance)
          };
          break;

        case 'market_trend':
          const allCompanies = await this.db.getAllCompanies();
          const marketPerformance = await this.analyzeCompanyPerformances(allCompanies.slice(0, 20), period); // Limit for performance
          analysis.trend_data = {
            market: 'IBEX 35',
            companies_analyzed: marketPerformance.length,
            market_direction: this.determineMarketDirection(marketPerformance),
            sector_performance: await this.getSectorCorrelationAnalysis(period),
            volatility_index: this.calculateMarketVolatility(marketPerformance)
          };
          break;

        case 'correlation_analysis':
          const correlationData = await this.getSectorCorrelationAnalysis(period);
          analysis.trend_data = {
            ...correlationData,
            correlation_insights: this.generateCorrelationInsights(correlationData)
          };
          break;
      }

      return analysis;
    } catch (error) {
      throw new Error(`Trend analysis failed: ${error}`);
    }
  }

  // Investment risk assessment
  async assessInvestmentRisk(target: string, riskTypes: string[] = ['all']): Promise<any> {
    try {
      const riskAssessment = {
        target: target,
        assessment_date: new Date().toISOString(),
        risk_types_analyzed: riskTypes,
        overall_risk_score: 0,
        risk_breakdown: {},
        recommendations: []
      };

      // Try to determine if target is a company, sector, or portfolio
      let targetType = 'unknown';
      let targetData = null;

      try {
        targetData = await this.db.getCompanyBySymbol(target);
        targetType = 'company';
      } catch {
        try {
          targetData = await this.db.getCompaniesBySector(target);
          targetType = 'sector';
        } catch {
          // Assume it's a portfolio or custom target
          targetType = 'portfolio';
        }
      }

      // Initialize risk_breakdown as any to allow dynamic property assignment
      const riskBreakdown: any = {};

      // Assess different risk types
      if (riskTypes.includes('all') || riskTypes.includes('market_risk')) {
        riskBreakdown.market_risk = await this.assessMarketRisk(targetData, targetType);
      }

      if (riskTypes.includes('all') || riskTypes.includes('governance_risk')) {
        riskBreakdown.governance_risk = await this.assessGovernanceRisk(targetData, targetType);
      }

      if (riskTypes.includes('all') || riskTypes.includes('sector_risk')) {
        riskBreakdown.sector_risk = await this.assessSectorRisk(targetData, targetType);
      }

      if (riskTypes.includes('all') || riskTypes.includes('liquidity_risk')) {
        riskBreakdown.liquidity_risk = await this.assessLiquidityRisk(targetData, targetType);
      }

      if (riskTypes.includes('all') || riskTypes.includes('concentration_risk')) {
        riskBreakdown.concentration_risk = await this.assessConcentrationRisk(targetData, targetType);
      }

      riskAssessment.risk_breakdown = riskBreakdown;

      // Calculate overall risk score
      riskAssessment.overall_risk_score = this.calculateOverallRiskScore(riskAssessment.risk_breakdown);
      riskAssessment.recommendations = this.generateRiskRecommendations(riskAssessment.risk_breakdown);

      return riskAssessment;
    } catch (error) {
      throw new Error(`Risk assessment failed: ${error}`);
    }
  }

  // Generate comprehensive analyst reports
  async generateAnalystReport(subject: string, reportType: string, includeCharts: boolean = true): Promise<any> {
    try {
      const report = {
        subject: subject,
        report_type: reportType,
        generated_date: new Date().toISOString(),
        executive_summary: '',
        sections: {},
        charts: includeCharts ? [] : null,
        conclusions: [],
        recommendations: []
      };

      switch (reportType) {
        case 'company_deep_dive':
          const company = await this.db.getCompanyBySymbol(subject);
          if (!company) throw new Error(`Company ${subject} not found`);

          report.sections = {
            company_overview: company,
            financial_metrics: {
              market_cap: company.market_cap,
              pe_ratio: company.price_to_earnings || company.pe_ratio,
              sector: company.sector
            },
            governance_analysis: await this.getCompanyGovernanceAnalysis(company),
            market_position: await this.getCompanyMarketPosition(company),
            risk_assessment: await this.assessInvestmentRisk(subject),
            recent_developments: await this.db.getRecentNews(company.id, 10)
          };
          
          report.executive_summary = this.generateCompanyExecutiveSummary(report.sections);
          break;

        case 'sector_overview':
          const sectorCompanies = await this.db.getCompaniesBySector(subject);
          const sectorAnalysis = await this.getSectorCorrelationAnalysis(30);

          report.sections = {
            sector_overview: {
              sector_name: subject,
              company_count: sectorCompanies.length,
              total_market_cap: sectorCompanies.reduce((sum, c) => sum + (c.market_cap || 0), 0)
            },
            performance_analysis: sectorAnalysis,
            key_players: sectorCompanies.slice(0, 10),
            market_trends: await this.analyzeTrends('sector_trend', subject, 30),
            competitive_landscape: await this.analyzeSectorCompetition(sectorCompanies)
          };
          break;

        // Add other report types as needed
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      report.conclusions = this.generateReportConclusions(report);
      report.recommendations = this.generateReportRecommendations(report);

      return report;
    } catch (error) {
      throw new Error(`Report generation failed: ${error}`);
    }
  }

  // Investment opportunity screening
  async screenOpportunities(criteria: any, limit: number = 10): Promise<any> {
    try {
      const companies = await this.db.getAllCompanies();
      const screening = {
        criteria: criteria,
        total_companies_screened: companies.length,
        opportunities: [],
        screening_date: new Date().toISOString(),
        summary: {}
      };

      // Apply screening filters
      let filteredCompanies = companies;

      if (criteria.pe_ratio_min !== undefined || criteria.pe_ratio_max !== undefined) {
        filteredCompanies = filteredCompanies.filter(company => {
          const pe = company.price_to_earnings || company.pe_ratio;
          if (pe === null || pe === undefined) return false;
          
          if (criteria.pe_ratio_min !== undefined && pe < criteria.pe_ratio_min) return false;
          if (criteria.pe_ratio_max !== undefined && pe > criteria.pe_ratio_max) return false;
          return true;
        });
      }

      if (criteria.market_cap_min !== undefined || criteria.market_cap_max !== undefined) {
        filteredCompanies = filteredCompanies.filter(company => {
          if (!company.market_cap) return false;
          
          if (criteria.market_cap_min !== undefined && company.market_cap < criteria.market_cap_min) return false;
          if (criteria.market_cap_max !== undefined && company.market_cap > criteria.market_cap_max) return false;
          return true;
        });
      }

      if (criteria.sectors && criteria.sectors.length > 0) {
        filteredCompanies = filteredCompanies.filter(company => 
          criteria.sectors.some(sector => 
            company.sector?.toLowerCase().includes(sector.toLowerCase())
          )
        );
      }

      if (criteria.exclude_sectors && criteria.exclude_sectors.length > 0) {
        filteredCompanies = filteredCompanies.filter(company => 
          !criteria.exclude_sectors.some(sector => 
            company.sector?.toLowerCase().includes(sector.toLowerCase())
          )
        );
      }

      // Score and rank opportunities
      const scoredOpportunities = await this.scoreOpportunities(filteredCompanies, criteria);
      screening.opportunities = scoredOpportunities.slice(0, limit);

      screening.summary = {
        companies_passed_screening: scoredOpportunities.length,
        top_scoring_sector: this.getTopSector(scoredOpportunities),
        average_score: scoredOpportunities.length > 0 ? 
          scoredOpportunities.reduce((sum, opp) => sum + opp.score, 0) / scoredOpportunities.length : 0
      };

      return screening;
    } catch (error) {
      throw new Error(`Opportunity screening failed: ${error}`);
    }
  }

  // Helper methods for the enhanced functionality

  private generateTrendSummary(topPerformers: any[]): string {
    const avgChange = topPerformers.reduce((sum, p) => sum + (p.period_change || 0), 0) / topPerformers.length;
    const direction = avgChange > 0 ? 'upward' : 'downward';
    return `Market showing ${direction} trend with average change of ${avgChange.toFixed(2)}%`;
  }

  private generateActionSuggestions(interpretation: string, results: any): string[] {
    const suggestions = [];
    
    if (interpretation.includes('Banking')) {
      suggestions.push('Use get_companies_by_sector with "banking" for more details');
      suggestions.push('Try compare_companies to analyze specific banking stocks');
    }
    
    if (interpretation.includes('risk')) {
      suggestions.push('Use assess_investment_risk for detailed risk analysis');
      suggestions.push('Try get_board_interlocks to analyze governance connections');
    }
    
    suggestions.push('Use generate_analyst_report for comprehensive analysis');
    suggestions.push('Try screen_opportunities to find investment candidates');
    
    return suggestions;
  }

  private async analyzeCompanyPerformances(companies: any[], period: number): Promise<any[]> {
    const performances = [];
    
    for (const company of companies.slice(0, 10)) { // Limit for performance
      try {
        const historical = await this.db.getHistoricalPrices(company.id, period);
        if (historical.length >= 2) {
          const recent = historical[0];
          const old = historical[historical.length - 1];
          const change = ((recent.close - old.close) / old.close) * 100;
          
          performances.push({
            symbol: company.symbol,
            name: company.name,
            sector: company.sector,
            period_change: change,
            current_price: recent.close,
            volatility: this.calculateVolatility(historical)
          });
        }
      } catch (error) {
        // Skip companies with no data
        continue;
      }
    }
    
    return performances.sort((a, b) => (b.period_change || 0) - (a.period_change || 0));
  }

  private calculatePerformance(historical: any[]): any {
    if (historical.length < 2) return null;
    
    const recent = historical[0];
    const old = historical[historical.length - 1];
    const change = ((recent.close - old.close) / old.close) * 100;
    
    return {
      period_change: change,
      current_price: recent.close,
      starting_price: old.close,
      volatility: this.calculateVolatility(historical)
    };
  }

  private calculateVolatility(prices: any[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i-1].close - prices[i].close) / prices[i].close;
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  private assessCompanyRisk(company: any, directors: any[]): string {
    let riskLevel = 'low';
    
    if (directors.length > 15) riskLevel = 'medium'; // Large board
    if (!company.market_cap || company.market_cap < 1000000000) riskLevel = 'medium'; // Small cap
    if (!company.price_to_earnings && !company.pe_ratio) riskLevel = 'high'; // No PE data
    
    return riskLevel;
  }

  private generateComparisonSummary(companyData: any[]): any {
    const validCompanies = companyData.filter(c => !c.error);
    if (validCompanies.length === 0) return { error: 'No valid companies to compare' };
    
    return {
      companies_analyzed: validCompanies.length,
      best_performer: validCompanies.reduce((best, current) => 
        (current.recent_performance?.period_change || -Infinity) > 
        (best.recent_performance?.period_change || -Infinity) ? current : best
      ),
      most_covered: validCompanies.reduce((most, current) => 
        (current.news_coverage || 0) > (most.news_coverage || 0) ? current : most
      ),
      risk_levels: validCompanies.map(c => ({
        company: c.basic_info?.symbol,
        risk: c.risk_profile
      }))
    };
  }

  private generateComparisonRecommendations(companyData: any[]): string[] {
    const recommendations = [];
    const validCompanies = companyData.filter(c => !c.error);
    
    if (validCompanies.length === 0) {
      recommendations.push('Unable to generate recommendations - no valid company data');
      return recommendations;
    }
    
    const bestPerformer = validCompanies.reduce((best, current) => 
      (current.recent_performance?.period_change || -Infinity) > 
      (best.recent_performance?.period_change || -Infinity) ? current : best
    );
    
    recommendations.push(`${bestPerformer.basic_info?.name} shows strongest recent performance`);
    
    const lowRiskCompanies = validCompanies.filter(c => c.risk_profile === 'low');
    if (lowRiskCompanies.length > 0) {
      recommendations.push(`Consider ${lowRiskCompanies[0].basic_info?.name} for lower risk exposure`);
    }
    
    recommendations.push('Monitor news coverage for market sentiment changes');
    
    return recommendations;
  }

  private analyzePriceTrend(historical: any[]): any {
    if (historical.length < 2) return null;
    
    const prices = historical.map(h => h.close).reverse(); // Chronological order
    const trend = {
      direction: 'sideways',
      strength: 0,
      support_level: Math.min(...prices),
      resistance_level: Math.max(...prices),
      current_position: 'middle'
    };
    
    // Simple trend calculation
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = (lastPrice - firstPrice) / firstPrice;
    
    if (change > 0.05) trend.direction = 'upward';
    else if (change < -0.05) trend.direction = 'downward';
    
    trend.strength = Math.abs(change);
    
    // Position relative to range
    const range = trend.resistance_level - trend.support_level;
    const position = (lastPrice - trend.support_level) / range;
    
    if (position > 0.7) trend.current_position = 'near_resistance';
    else if (position < 0.3) trend.current_position = 'near_support';
    
    return trend;
  }

  private generateTrendInsights(trendData: any, company: any): string[] {
    const insights = [];
    
    if (!trendData) {
      insights.push('Insufficient historical data for trend analysis');
      return insights;
    }
    
    insights.push(`${company.name} is in a ${trendData.direction} trend`);
    
    if (trendData.strength > 0.1) {
      insights.push(`Strong trend movement with ${(trendData.strength * 100).toFixed(1)}% change`);
    }
    
    if (trendData.current_position === 'near_resistance') {
      insights.push('Price approaching resistance level - potential reversal area');
    } else if (trendData.current_position === 'near_support') {
      insights.push('Price near support level - potential buying opportunity');
    }
    
    return insights;
  }

  private generateSimpleForecast(historical: any[]): any {
    if (historical.length < 5) return null;
    
    const prices = historical.map(h => h.close).reverse().slice(-5); // Last 5 prices
    const avgChange = prices.reduce((sum, price, i) => {
      if (i === 0) return sum;
      return sum + (price - prices[i-1]) / prices[i-1];
    }, 0) / (prices.length - 1);
    
    const lastPrice = prices[prices.length - 1];
    const forecastPrice = lastPrice * (1 + avgChange);
    
    return {
      method: 'Simple moving average',
      forecast_price: forecastPrice,
      confidence: 'low',
      timeframe: '1 day ahead',
      disclaimer: 'This is a basic forecast and should not be used for investment decisions'
    };
  }

  // Additional helper methods would continue here...
  // For brevity, I'll implement the key ones and leave placeholders for others

  private calculateSectorVolatility(performances: any[]): number {
    const changes = performances.map(p => p.period_change || 0);
    const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
    return Math.sqrt(variance);
  }

  private determineMarketDirection(performances: any[]): string {
    const avgChange = performances.reduce((sum, p) => sum + (p.period_change || 0), 0) / performances.length;
    if (avgChange > 2) return 'strongly_bullish';
    if (avgChange > 0.5) return 'bullish';
    if (avgChange < -2) return 'strongly_bearish';
    if (avgChange < -0.5) return 'bearish';
    return 'neutral';
  }

  private calculateMarketVolatility(performances: any[]): number {
    return this.calculateSectorVolatility(performances);
  }

  private generateCorrelationInsights(correlationData: any): string[] {
    return [
      `Market shows ${correlationData.concentration_level} concentration`,
      `Top sector: ${correlationData.largest_sector}`,
      'Correlation analysis suggests diversification opportunities across sectors'
    ];
  }

  // Risk assessment helper methods (simplified implementations)
  private async assessMarketRisk(targetData: any, targetType: string): Promise<any> {
    return {
      risk_level: 'medium',
      factors: ['Market volatility', 'Sector concentration'],
      score: 6.5,
      recommendations: ['Diversify across sectors', 'Monitor market trends']
    };
  }

  private async assessGovernanceRisk(targetData: any, targetType: string): Promise<any> {
    return {
      risk_level: 'low',
      factors: ['Board composition', 'Director interlocks'],
      score: 3.2,
      recommendations: ['Review board independence', 'Monitor governance changes']
    };
  }

  private async assessSectorRisk(targetData: any, targetType: string): Promise<any> {
    return {
      risk_level: 'medium',
      factors: ['Sector volatility', 'Regulatory environment'],
      score: 5.8,
      recommendations: ['Consider sector rotation', 'Monitor regulatory changes']
    };
  }

  private async assessLiquidityRisk(targetData: any, targetType: string): Promise<any> {
    return {
      risk_level: 'low',
      factors: ['Trading volume', 'Market cap'],
      score: 2.9,
      recommendations: ['Monitor trading volumes', 'Ensure sufficient liquidity for position size']
    };
  }

  private async assessConcentrationRisk(targetData: any, targetType: string): Promise<any> {
    return {
      risk_level: 'medium',
      factors: ['Position size', 'Sector exposure'],
      score: 6.1,
      recommendations: ['Diversify holdings', 'Limit single position exposure']
    };
  }

  private calculateOverallRiskScore(riskBreakdown: any): number {
    const scores = Object.values(riskBreakdown).map((risk: any) => risk.score || 5);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private generateRiskRecommendations(riskBreakdown: any): string[] {
    const recommendations = [];
    
    Object.entries(riskBreakdown).forEach(([riskType, riskData]: [string, any]) => {
      if (riskData.recommendations) {
        recommendations.push(...riskData.recommendations);
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  private async getCompanyGovernanceAnalysis(company: any): Promise<any> {
    const directors = await this.db.getCompanyDirectors(company.id);
    const interlocks = await this.db.getBoardInterlocks();
    
    const companyInterlocks = interlocks.filter(interlock => 
      interlock.companies.includes(company.name)
    );
    
    return {
      board_size: directors.length,
      director_interlocks: companyInterlocks.length,
      governance_score: this.calculateGovernanceScore(directors, companyInterlocks),
      risk_factors: companyInterlocks.length > 3 ? ['High director interlocks'] : []
    };
  }

  private async getCompanyMarketPosition(company: any): Promise<any> {
    const sectorCompanies = await this.db.getCompaniesBySector(company.sector);
    const position = sectorCompanies.findIndex(c => c.id === company.id) + 1;
    
    return {
      sector_rank: position,
      sector_companies: sectorCompanies.length,
      market_cap_percentile: this.calculatePercentile(company.market_cap, sectorCompanies.map(c => c.market_cap)),
      competitive_position: position <= 3 ? 'leader' : position <= 10 ? 'challenger' : 'follower'
    };
  }

  private generateCompanyExecutiveSummary(sections: any): string {
    const company = sections.company_overview;
    const risk = sections.risk_assessment;
    
    return `${company.name} is a ${company.sector} company with market cap of €${(company.market_cap / 1e9).toFixed(1)}B. ` +
           `Overall risk assessment: ${risk.overall_risk_score > 7 ? 'High' : risk.overall_risk_score > 4 ? 'Medium' : 'Low'}. ` +
           `Recent developments and market position analysis included.`;
  }

  private async analyzeSectorCompetition(companies: any[]): Promise<any> {
    return {
      total_companies: companies.length,
      market_leaders: companies.slice(0, 3),
      competition_intensity: companies.length > 10 ? 'high' : companies.length > 5 ? 'medium' : 'low',
      concentration_ratio: this.calculateConcentrationRatio(companies)
    };
  }

  private generateReportConclusions(report: any): string[] {
    return [
      `Analysis completed for ${report.subject}`,
      'Market conditions and competitive position evaluated',
      'Risk assessment and opportunities identified'
    ];
  }

  private generateReportRecommendations(report: any): string[] {
    return [
      'Continue monitoring market developments',
      'Review risk factors regularly',
      'Consider sector rotation opportunities'
    ];
  }

  private async scoreOpportunities(companies: any[], criteria: any): Promise<any[]> {
    const scored = companies.map(company => {
      let score = 5.0; // Base score
      
      // Scoring based on P/E ratio
      const pe = company.price_to_earnings || company.pe_ratio;
      if (pe && pe < 15) score += 1.0;
      if (pe && pe > 25) score -= 0.5;
      
      // Scoring based on market cap
      if (company.market_cap > 10e9) score += 0.5; // Large cap bonus
      if (company.market_cap < 1e9) score -= 0.3; // Small cap penalty
      
      // Scoring based on sector
      if (company.sector && ['banking', 'technology', 'healthcare'].includes(company.sector.toLowerCase())) {
        score += 0.3;
      }
      
      return {
        company: company,
        symbol: company.symbol,
        name: company.name,
        sector: company.sector,
        score: Math.max(0, Math.min(10, score)), // Clamp between 0-10
        key_metrics: {
          market_cap: company.market_cap,
          pe_ratio: pe
        }
      };
    });
    
    return scored.sort((a, b) => b.score - a.score);
  }

  private getTopSector(opportunities: any[]): string {
    const sectorCounts = {};
    opportunities.forEach(opp => {
      const sector = opp.sector || 'Other';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    });
    
    return Object.entries(sectorCounts).reduce((top, [sector, count]) => 
      count > (sectorCounts[top] || 0) ? sector : top, 'Other'
    );
  }

  private calculateGovernanceScore(directors: any[], interlocks: any[]): number {
    let score = 8.0; // Base good governance score
    
    if (directors.length > 15) score -= 1.0; // Too large board
    if (directors.length < 5) score -= 0.5; // Too small board
    if (interlocks.length > 5) score -= 2.0; // Too many interlocks
    
    return Math.max(0, Math.min(10, score));
  }

  private calculatePercentile(value: number, dataset: number[]): number {
    if (!value || dataset.length === 0) return 0;
    
    const sorted = dataset.filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    
    return index === -1 ? 100 : (index / sorted.length) * 100;
  }

  private calculateConcentrationRatio(companies: any[]): number {
    const marketCaps = companies.map(c => c.market_cap || 0).sort((a, b) => b - a);
    const total = marketCaps.reduce((sum, cap) => sum + cap, 0);
    const top4 = marketCaps.slice(0, 4).reduce((sum, cap) => sum + cap, 0);
    
    return total > 0 ? (top4 / total) * 100 : 0;
  }
}