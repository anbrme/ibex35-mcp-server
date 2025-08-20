export class DatabaseManager {
    apiUrl;
    apiKey;
    constructor(config) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
    }
    async fetchAPI(endpoint, params) {
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
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            throw new Error(`API request failed: ${error}`);
        }
    }
    // Company queries
    async getAllCompanies() {
        const data = await this.fetchAPI('/api/companies');
        return data.data || [];
    }
    async getCompanyBySymbol(symbol) {
        const companies = await this.getAllCompanies();
        return companies.find(company => company.symbol === symbol) || null;
    }
    async getCompaniesBySector(sector) {
        const companies = await this.getAllCompanies();
        return companies.filter(company => company.sector && company.sector.toLowerCase().includes(sector.toLowerCase()));
    }
    async getCompaniesWithPERatio(minPE, maxPE) {
        const companies = await this.getAllCompanies();
        return companies.filter(company => {
            const pe = company.price_to_earnings || company.pe_ratio;
            if (pe === null || pe === undefined)
                return false;
            if (minPE !== undefined && pe < minPE)
                return false;
            if (maxPE !== undefined && pe > maxPE)
                return false;
            return true;
        });
    }
    // Director and governance queries - using network endpoint
    async getCompanyDirectors(companyId) {
        const data = await this.fetchAPI('/api/network');
        const directors = data.directors || [];
        return directors.filter(director => director.company_id === companyId);
    }
    async getBoardInterlocks() {
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
    async getDirectorsByName(name) {
        const data = await this.fetchAPI('/api/network');
        const directors = data.directors || [];
        return directors.filter(director => director.name && director.name.toLowerCase().includes(name.toLowerCase()));
    }
    // Shareholder queries
    async getCompanyShareholders(companyId) {
        const data = await this.fetchAPI('/api/shareholder-positions');
        const shareholders = data.shareholderPositions || data.positions || [];
        // Find company by ID first to get symbol
        const companies = await this.getAllCompanies();
        const company = companies.find(c => c.id === companyId);
        if (!company)
            return [];
        return shareholders.filter(position => position.company_symbol === company.symbol ||
            position.ticker === company.symbol);
    }
    async getTopShareholdersBySector(sector, limit = 10) {
        const companies = await this.getCompaniesBySector(sector);
        const data = await this.fetchAPI('/api/shareholder-positions');
        const shareholders = data.shareholderPositions || data.positions || [];
        const sectorSymbols = companies.map(c => c.symbol);
        const sectorShareholders = shareholders.filter(position => sectorSymbols.includes(position.company_symbol || position.ticker));
        return sectorShareholders
            .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
            .slice(0, limit);
    }
    async getShareholderOverlap() {
        const data = await this.fetchAPI('/api/shareholder-positions');
        const shareholders = data.shareholderPositions || data.positions || [];
        // Group by shareholder name
        const shareholderMap = new Map();
        shareholders.forEach(position => {
            const name = position.shareholder_name || position.name;
            if (!name)
                return;
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
    async getHistoricalPrices(companyId, days = 30) {
        // Find company symbol from ID
        const companies = await this.getAllCompanies();
        const company = companies.find(c => c.id === companyId);
        if (!company)
            return [];
        const data = await this.fetchAPI('/api/historical-prices/company', {
            symbol: company.symbol,
            days: days
        });
        return data.historicalData || [];
    }
    async getTopPerformers(days = 7, limit = 10) {
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
            }
            catch (error) {
                // Skip companies with no data
                continue;
            }
        }
        return performances
            .sort((a, b) => b.period_change - a.period_change)
            .slice(0, limit);
    }
    // News and sentiment queries
    async getRecentNews(companyId, limit = 20) {
        if (companyId) {
            const companies = await this.getAllCompanies();
            const company = companies.find(c => c.id === companyId);
            if (!company)
                return [];
            const data = await this.fetchAPI('/api/news/company', {
                symbol: company.symbol,
                limit: limit
            });
            return data.news || [];
        }
        else {
            const data = await this.fetchAPI('/api/news', { limit: limit });
            return data.news || [];
        }
    }
    async getNewsBySentiment(sentiment, limit = 20) {
        const data = await this.fetchAPI('/api/news/sentiment', {
            sentiment: sentiment,
            limit: limit
        });
        return data.news || [];
    }
    // Lobbying and transparency queries
    async getLobbyingMeetings(companyId, limit = 20) {
        const data = await this.fetchAPI('/api/lobbying', { limit: limit });
        const meetings = data.meetings || data.lobbying || [];
        if (companyId) {
            const companies = await this.getAllCompanies();
            const company = companies.find(c => c.id === companyId);
            if (!company)
                return [];
            return meetings.filter(meeting => meeting.organization_name &&
                meeting.organization_name.toLowerCase().includes(company.name.toLowerCase()));
        }
        return meetings;
    }
    async getMostActiveLobbyists(limit = 10) {
        const data = await this.fetchAPI('/api/lobbying');
        const meetings = data.meetings || data.lobbying || [];
        // Group by organization and count meetings
        const orgCounts = new Map();
        meetings.forEach(meeting => {
            const org = meeting.organization_name;
            if (!org)
                return;
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
            if (meeting.eu_institution)
                entry.institutions.add(meeting.eu_institution);
            if (meeting.quarterly_spending)
                entry.spending.push(meeting.quarterly_spending);
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
    async getWeeklyReports(reportType, limit = 10) {
        const data = await this.fetchAPI('/api/reports', {
            type: reportType,
            limit: limit
        });
        return data.reports || [];
    }
    // ESG data - not available in current API, return empty array
    async getESGScores(companyId) {
        return []; // ESG data not available in current worker API
    }
    // Custom query execution - not supported for Cloudflare D1 via API
    async executeCustomQuery(sql, params = []) {
        throw new Error('Custom SQL queries are not supported via the Cloudflare Worker API. Please use the specific endpoints available.');
    }
    close() {
        // No cleanup needed for HTTP API connections
    }
}
