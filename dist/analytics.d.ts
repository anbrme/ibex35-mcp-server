import { DatabaseManager } from './database.js';
export declare class AnalyticsManager {
    private db;
    constructor(db: DatabaseManager);
    getComplexNetworkAnalysis(): Promise<any>;
    private calculateDirectorNetworkMetrics;
    private calculateShareholderNetworkMetrics;
    private getGovernanceRiskFactors;
    getSectorCorrelationAnalysis(days?: number): Promise<any>;
    private calculateMarketConcentration;
}
