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
    const apiUrl = process.env.IBEX35_API_URL || 'https://ibex35-sheets-api.anurnberg.workers.dev';
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