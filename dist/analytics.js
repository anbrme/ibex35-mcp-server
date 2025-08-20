export class AnalyticsManager {
    db;
    constructor(db) {
        this.db = db;
    }
    // Network analysis for board interlocks and corporate governance
    async getComplexNetworkAnalysis() {
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
    calculateDirectorNetworkMetrics(interlocks) {
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
    calculateShareholderNetworkMetrics(overlaps) {
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
    async getGovernanceRiskFactors(companies, interlocks) {
        // Analyze companies for governance red flags
        const redFlags = [];
        companies.forEach(company => {
            // Check for high director interlocks
            const companyInterlocks = interlocks.filter(interlock => interlock.companies.includes(company.symbol));
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
            governance_red_flags: redFlags.sort((a, b) => (b.severity === 'high' ? 3 : b.severity === 'medium' ? 2 : 1) -
                (a.severity === 'high' ? 3 : a.severity === 'medium' ? 2 : 1)),
            total_red_flags: redFlags.length,
            high_risk_companies: redFlags.filter(f => f.severity === 'high').length
        };
    }
    // Market correlation analysis
    async getSectorCorrelationAnalysis(days = 30) {
        const companies = await this.db.getAllCompanies();
        // Group companies by sector
        const sectorMap = new Map();
        companies.forEach(company => {
            if (!company.sector)
                return;
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
    calculateMarketConcentration(sectorPerformance) {
        const totalMarketCap = sectorPerformance.reduce((sum, sector) => sum + sector.total_market_cap, 0);
        if (totalMarketCap === 0)
            return { hhi_index: 0, concentration_level: 'unknown' };
        // Calculate Herfindahl-Hirschman Index
        const hhi = sectorPerformance.reduce((sum, sector) => {
            const share = sector.total_market_cap / totalMarketCap;
            return sum + (share * share * 10000); // HHI scale
        }, 0);
        let concentrationLevel;
        if (hhi > 2500)
            concentrationLevel = 'highly_concentrated';
        else if (hhi > 1500)
            concentrationLevel = 'moderately_concentrated';
        else
            concentrationLevel = 'competitive';
        return {
            hhi_index: Math.round(hhi),
            concentration_level: concentrationLevel,
            top_3_market_share: sectorPerformance.slice(0, 3).reduce((sum, sector) => sum + (sector.total_market_cap / totalMarketCap), 0) * 100
        };
    }
}
