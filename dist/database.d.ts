export interface DatabaseConfig {
    apiUrl: string;
    apiKey?: string;
}
export declare class DatabaseManager {
    private apiUrl;
    private apiKey?;
    constructor(config: DatabaseConfig);
    private fetchAPI;
    getAllCompanies(): Promise<any[]>;
    getCompanyBySymbol(symbol: string): Promise<any>;
    getCompaniesBySector(sector: string): Promise<any[]>;
    getCompaniesWithPERatio(minPE?: number, maxPE?: number): Promise<any[]>;
    getCompanyDirectors(companyId: string): Promise<any[]>;
    getBoardInterlocks(): Promise<any[]>;
    getDirectorsByName(name: string): Promise<any[]>;
    getCompanyShareholders(companyId: string): Promise<any[]>;
    getTopShareholdersBySector(sector: string, limit?: number): Promise<any[]>;
    getShareholderOverlap(): Promise<any[]>;
    getHistoricalPrices(companyId: string, days?: number): Promise<any[]>;
    getTopPerformers(days?: number, limit?: number): Promise<any[]>;
    getRecentNews(companyId?: string, limit?: number): Promise<any[]>;
    getNewsBySentiment(sentiment: string, limit?: number): Promise<any[]>;
    getLobbyingMeetings(companyId?: string, limit?: number): Promise<any[]>;
    getMostActiveLobbyists(limit?: number): Promise<any[]>;
    getWeeklyReports(reportType?: string, limit?: number): Promise<any[]>;
    getESGScores(companyId?: string): Promise<any[]>;
    executeCustomQuery(sql: string, params?: any[]): Promise<any[]>;
    close(): void;
}
