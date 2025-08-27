#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DatabaseManager } from './database.js';
import { AnalyticsManager } from './analytics.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IBEX35MCPServer {
  private server: Server;
  private db: DatabaseManager;
  private analytics: AnalyticsManager;

  constructor() {
    this.server = new Server(
      {
        name: 'ibex35-database-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize database connection to Cloudflare Worker API
    const apiUrl = process.env.IBEX35_API_URL || 'https://ibex35-api.ncdata.eu';
    const apiKey = process.env.IBEX35_API_KEY;
    this.db = new DatabaseManager({ apiUrl, apiKey });
    this.analytics = new AnalyticsManager(this.db);

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Company queries
          {
            name: 'get_all_companies',
            description: 'Get all IBEX 35 companies with current prices and key metrics',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_company_by_symbol',
            description: 'Get detailed information for a specific company by its stock symbol',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Stock symbol (e.g., SAN, TEF, IBE)',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_companies_by_sector',
            description: 'Get companies filtered by sector',
            inputSchema: {
              type: 'object',
              properties: {
                sector: {
                  type: 'string',
                  description: 'Sector name or partial match (e.g., Banking, Technology, Energy)',
                },
              },
              required: ['sector'],
            },
          },
          {
            name: 'get_companies_with_pe_ratio',
            description: 'Get companies filtered by P/E ratio range',
            inputSchema: {
              type: 'object',
              properties: {
                minPE: {
                  type: 'number',
                  description: 'Minimum P/E ratio',
                },
                maxPE: {
                  type: 'number',
                  description: 'Maximum P/E ratio',
                },
              },
            },
          },
          
          // Director and governance queries
          {
            name: 'get_company_directors',
            description: 'Get board directors for a specific company',
            inputSchema: {
              type: 'object',
              properties: {
                companyId: {
                  type: 'string',
                  description: 'Company ID or use get_company_by_symbol first to get ID',
                },
              },
              required: ['companyId'],
            },
          },
          {
            name: 'get_board_interlocks',
            description: 'Find directors who serve on multiple IBEX 35 company boards',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_directors_by_name',
            description: 'Search for directors by name across all companies',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Director name or partial match',
                },
              },
              required: ['name'],
            },
          },

          // Shareholder queries
          {
            name: 'get_company_shareholders',
            description: 'Get shareholders for a specific company',
            inputSchema: {
              type: 'object',
              properties: {
                companyId: {
                  type: 'string',
                  description: 'Company ID',
                },
              },
              required: ['companyId'],
            },
          },
          {
            name: 'get_shareholder_overlap',
            description: 'Find shareholders who own stakes in multiple IBEX 35 companies',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_top_shareholders_by_sector',
            description: 'Get top shareholders in a specific sector',
            inputSchema: {
              type: 'object',
              properties: {
                sector: {
                  type: 'string',
                  description: 'Sector name',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 10,
                },
              },
              required: ['sector'],
            },
          },

          // Market data queries
          {
            name: 'get_historical_prices',
            description: 'Get historical price data for a company',
            inputSchema: {
              type: 'object',
              properties: {
                companyId: {
                  type: 'string',
                  description: 'Company ID',
                },
                days: {
                  type: 'number',
                  description: 'Number of days of historical data',
                  default: 30,
                },
              },
              required: ['companyId'],
            },
          },
          {
            name: 'get_top_performers',
            description: 'Get top performing stocks over a specified period',
            inputSchema: {
              type: 'object',
              properties: {
                days: {
                  type: 'number',
                  description: 'Period in days',
                  default: 7,
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 10,
                },
              },
            },
          },

          // News and sentiment
          {
            name: 'get_recent_news',
            description: 'Get recent news articles, optionally filtered by company',
            inputSchema: {
              type: 'object',
              properties: {
                companyId: {
                  type: 'string',
                  description: 'Optional: Company ID to filter by',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of articles',
                  default: 20,
                },
              },
            },
          },
          {
            name: 'get_news_by_sentiment',
            description: 'Get news articles filtered by sentiment',
            inputSchema: {
              type: 'object',
              properties: {
                sentiment: {
                  type: 'string',
                  enum: ['positive', 'negative', 'neutral'],
                  description: 'News sentiment',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of articles',
                  default: 20,
                },
              },
              required: ['sentiment'],
            },
          },

          // Lobbying and transparency
          {
            name: 'get_lobbying_meetings',
            description: 'Get EU lobbying meetings, optionally filtered by company',
            inputSchema: {
              type: 'object',
              properties: {
                companyId: {
                  type: 'string',
                  description: 'Optional: Company ID to filter by',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of meetings',
                  default: 20,
                },
              },
            },
          },
          {
            name: 'get_most_active_lobbyists',
            description: 'Get organizations with the most EU lobbying meetings',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 10,
                },
              },
            },
          },

          // ESG data
          {
            name: 'get_esg_scores',
            description: 'Get ESG (Environmental, Social, Governance) scores',
            inputSchema: {
              type: 'object',
              properties: {
                companyId: {
                  type: 'string',
                  description: 'Optional: Company ID to filter by',
                },
              },
            },
          },

          // Weekly reports
          {
            name: 'get_weekly_reports',
            description: 'Get generated weekly reports and analysis',
            inputSchema: {
              type: 'object',
              properties: {
                reportType: {
                  type: 'string',
                  enum: ['market_overview', 'sector_analysis', 'governance_highlights', 'full_report'],
                  description: 'Type of report to filter by',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of reports',
                  default: 10,
                },
              },
            },
          },

          // Advanced Analytics
          {
            name: 'get_network_analysis',
            description: 'Get comprehensive network analysis of board interlocks and shareholder relationships',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_sector_correlation_analysis',
            description: 'Analyze sector performance correlations and market trends',
            inputSchema: {
              type: 'object',
              properties: {
                days: {
                  type: 'number',
                  description: 'Number of days to analyze',
                  default: 30,
                },
              },
            },
          },

          // Enhanced query processing and analysis
          {
            name: 'analyze_natural_query',
            description: 'Process and execute complex natural language queries about companies, financials, governance, or markets',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language query (e.g., "Which banking stocks have grown most in the last month?", "Show me companies with high governance risk", "Compare energy sector performance")',
                },
                context: {
                  type: 'string',
                  description: 'Optional context or previous query results to build upon',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'compare_companies',
            description: 'Compare multiple companies across various metrics (financial, governance, market performance)',
            inputSchema: {
              type: 'object',
              properties: {
                companies: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'List of company symbols or names to compare',
                },
                metrics: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['financial', 'governance', 'market_performance', 'sector_position', 'risk_profile', 'all'],
                  },
                  description: 'Metrics to compare (defaults to all if not specified)',
                  default: ['all'],
                },
              },
              required: ['companies'],
            },
          },
          {
            name: 'analyze_trends',
            description: 'Analyze trends in stock prices, market performance, or sector movements over time',
            inputSchema: {
              type: 'object',
              properties: {
                analysis_type: {
                  type: 'string',
                  enum: ['company_trend', 'sector_trend', 'market_trend', 'correlation_analysis'],
                  description: 'Type of trend analysis to perform',
                },
                target: {
                  type: 'string',
                  description: 'Company symbol, sector name, or "market" for overall analysis',
                },
                period: {
                  type: 'number',
                  description: 'Number of days to analyze',
                  default: 30,
                },
                include_forecast: {
                  type: 'boolean',
                  description: 'Whether to include simple trend forecast',
                  default: false,
                },
              },
              required: ['analysis_type', 'target'],
            },
          },
          {
            name: 'assess_investment_risk',
            description: 'Comprehensive risk assessment for companies or sectors including market, governance, and operational risks',
            inputSchema: {
              type: 'object',
              properties: {
                target: {
                  type: 'string',
                  description: 'Company symbol, sector name, or portfolio of companies',
                },
                risk_types: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['market_risk', 'governance_risk', 'sector_risk', 'liquidity_risk', 'concentration_risk', 'all'],
                  },
                  description: 'Types of risk to assess',
                  default: ['all'],
                },
              },
              required: ['target'],
            },
          },
          {
            name: 'generate_analyst_report',
            description: 'Generate a comprehensive analyst report for a company, sector, or market theme',
            inputSchema: {
              type: 'object',
              properties: {
                subject: {
                  type: 'string',
                  description: 'Company symbol, sector name, or theme to analyze',
                },
                report_type: {
                  type: 'string',
                  enum: ['company_deep_dive', 'sector_overview', 'governance_analysis', 'market_opportunity', 'risk_assessment'],
                  description: 'Type of report to generate',
                },
                include_charts: {
                  type: 'boolean',
                  description: 'Whether to include data visualizations (text-based)',
                  default: true,
                },
              },
              required: ['subject', 'report_type'],
            },
          },
          {
            name: 'screen_opportunities',
            description: 'Screen for investment opportunities based on specific criteria (value, growth, dividend, ESG, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                screening_criteria: {
                  type: 'object',
                  properties: {
                    pe_ratio_max: {
                      type: 'number',
                      description: 'Maximum P/E ratio',
                    },
                    pe_ratio_min: {
                      type: 'number',
                      description: 'Minimum P/E ratio',
                    },
                    market_cap_min: {
                      type: 'number',
                      description: 'Minimum market capitalization',
                    },
                    market_cap_max: {
                      type: 'number',
                      description: 'Maximum market capitalization',
                    },
                    sectors: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                      description: 'Specific sectors to include',
                    },
                    exclude_sectors: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                      description: 'Sectors to exclude',
                    },
                    performance_period: {
                      type: 'number',
                      description: 'Days to look back for performance metrics',
                      default: 30,
                    },
                    governance_quality: {
                      type: 'string',
                      enum: ['high', 'medium', 'low', 'any'],
                      description: 'Required governance quality level',
                      default: 'any',
                    },
                  },
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of opportunities to return',
                  default: 10,
                },
              },
              required: ['screening_criteria'],
            },
          },

          // Custom queries
          {
            name: 'execute_custom_query',
            description: 'Execute a custom SQL query on the database (SELECT only)',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'SQL SELECT query to execute',
                },
                params: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Optional parameters for the query',
                  default: [],
                },
              },
              required: ['sql'],
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;

        switch (name) {
          case 'get_all_companies':
            result = await this.db.getAllCompanies();
            break;

          case 'get_company_by_symbol':
            result = await this.db.getCompanyBySymbol((args as any)?.symbol);
            break;

          case 'get_companies_by_sector':
            result = await this.db.getCompaniesBySector((args as any)?.sector);
            break;

          case 'get_companies_with_pe_ratio':
            result = await this.db.getCompaniesWithPERatio((args as any)?.minPE, (args as any)?.maxPE);
            break;

          case 'get_company_directors':
            result = await this.db.getCompanyDirectors((args as any)?.companyId);
            break;

          case 'get_board_interlocks':
            result = await this.db.getBoardInterlocks();
            break;

          case 'get_directors_by_name':
            result = await this.db.getDirectorsByName((args as any)?.name);
            break;

          case 'get_company_shareholders':
            result = await this.db.getCompanyShareholders((args as any)?.companyId);
            break;

          case 'get_shareholder_overlap':
            result = await this.db.getShareholderOverlap();
            break;

          case 'get_top_shareholders_by_sector':
            result = await this.db.getTopShareholdersBySector((args as any)?.sector, (args as any)?.limit || 10);
            break;

          case 'get_historical_prices':
            result = await this.db.getHistoricalPrices((args as any)?.companyId, (args as any)?.days || 30);
            break;

          case 'get_top_performers':
            result = await this.db.getTopPerformers((args as any)?.days || 7, (args as any)?.limit || 10);
            break;

          case 'get_recent_news':
            result = await this.db.getRecentNews((args as any)?.companyId, (args as any)?.limit || 20);
            break;

          case 'get_news_by_sentiment':
            result = await this.db.getNewsBySentiment((args as any)?.sentiment, (args as any)?.limit || 20);
            break;

          case 'get_lobbying_meetings':
            result = await this.db.getLobbyingMeetings((args as any)?.companyId, (args as any)?.limit || 20);
            break;

          case 'get_most_active_lobbyists':
            result = await this.db.getMostActiveLobbyists((args as any)?.limit || 10);
            break;

          case 'get_esg_scores':
            result = await this.db.getESGScores((args as any)?.companyId);
            break;

          case 'get_weekly_reports':
            result = await this.db.getWeeklyReports((args as any)?.reportType, (args as any)?.limit || 10);
            break;

          case 'get_network_analysis':
            result = await this.analytics.getComplexNetworkAnalysis();
            break;

          case 'get_sector_correlation_analysis':
            result = await this.analytics.getSectorCorrelationAnalysis((args as any)?.days || 30);
            break;

          case 'analyze_natural_query':
            result = await this.analytics.analyzeNaturalQuery((args as any)?.query, (args as any)?.context);
            break;

          case 'compare_companies':
            result = await this.analytics.compareCompanies((args as any)?.companies, (args as any)?.metrics || ['all']);
            break;

          case 'analyze_trends':
            result = await this.analytics.analyzeTrends(
              (args as any)?.analysis_type,
              (args as any)?.target,
              (args as any)?.period || 30,
              (args as any)?.include_forecast || false
            );
            break;

          case 'assess_investment_risk':
            result = await this.analytics.assessInvestmentRisk((args as any)?.target, (args as any)?.risk_types || ['all']);
            break;

          case 'generate_analyst_report':
            result = await this.analytics.generateAnalystReport(
              (args as any)?.subject,
              (args as any)?.report_type,
              (args as any)?.include_charts !== false
            );
            break;

          case 'screen_opportunities':
            result = await this.analytics.screenOpportunities((args as any)?.screening_criteria, (args as any)?.limit || 10);
            break;

          case 'execute_custom_query':
            result = await this.db.executeCustomQuery((args as any)?.sql, (args as any)?.params || []);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      this.db.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('IBEX 35 MCP server running on stdio');
  }
}

const server = new IBEX35MCPServer();
server.run().catch(console.error);