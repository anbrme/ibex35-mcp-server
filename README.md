# IBEX 35 MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that provides Claude and other LLMs with comprehensive access to Spanish IBEX 35 stock market data, corporate governance information, and financial analytics.

## 🎯 What This Enables

Transform your AI assistant into a Spanish corporate intelligence expert:
- **Corporate Governance Analysis** - Board compositions, director interlocks, political affiliations
- **Financial Analytics** - Market cap, P/E ratios, sector analysis, performance metrics  
- **Shareholder Intelligence** - Ownership structures, institutional holdings, cross-holdings
- **Board Interlock Detection** - Directors serving on multiple boards
- **Political Connections** - Government-appointed directors and political backgrounds
- **Real-time Market Data** - Current prices, volumes, daily changes, historical trends

Perfect for financial research, corporate governance studies, investment analysis, and academic research on Spanish markets.

## Features

### Core Data Access
- **Company Information**: All IBEX 35 companies with real-time prices and key metrics
- **Historical Data**: OHLCV data, performance tracking, and trend analysis
- **Shareholders**: Ownership structures, concentration analysis, and cross-holdings
- **Board Directors**: Corporate governance, board interlocks, and executive relationships
- **News & Sentiment**: Recent news with sentiment analysis and relevance scoring
- **ESG Data**: Environmental, Social, and Governance scores and metrics

### Advanced Analytics ⚡ **ENHANCED**
- **Natural Language Processing**: Ask complex questions in plain English
- **Company Comparisons**: Side-by-side analysis across financial, governance, and performance metrics  
- **Trend Analysis & Forecasting**: Advanced price trend analysis with simple forecasting capabilities
- **Investment Risk Assessment**: Comprehensive risk evaluation across market, governance, and operational factors
- **Analyst Report Generation**: Professional company deep-dives, sector overviews, and governance analysis
- **Investment Opportunity Screening**: Filter and rank companies based on custom criteria
- **Network Analysis**: Board interlock analysis, shareholder overlap detection
- **Governance Risk Assessment**: Red flag identification, concentration metrics
- **Market Correlation**: Sector performance analysis and correlation studies
- **Lobbying Intelligence**: EU transparency data and political influence tracking

### Special Features
- **Real-time Sync**: Data synchronized from Google Sheets and multiple sources
- **Weekly Reports**: Automated market analysis and governance highlights
- **Custom Queries**: Execute safe SQL queries on the database
- **Comprehensive Indexing**: Optimized for complex relationship queries

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Claude Desktop app (or any MCP-compatible client)

### Installation

**Option 1: NPM Global Install (Recommended)**
```bash
npm install -g ibex35-mcp-server
```

**Option 2: From Source**
```bash
git clone https://github.com/anbrme/ibex35-mcp-server.git
cd ibex35-mcp-server
npm install
npm run build
```

## Configuration

### Environment Variables
- `IBEX35_API_URL`: URL to your Cloudflare Worker API (defaults to `https://ibex35-api.ncdata.eu`)
- `IBEX35_API_KEY`: Optional API key for authentication (if your worker requires it)

### Cloudflare Worker Setup
The server connects to your existing Cloudflare Worker that provides API access to the D1 database. No local database setup is required.

## Usage

### Standalone Mode
```bash
npm start
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

**For NPM Install:**
```json
{
  "mcpServers": {
    "ibex35-database": {
      "command": "ibex35-mcp",
      "env": {
        "IBEX35_API_URL": "https://ibex35-api.ncdata.eu"
      }
    }
  }
}
```

**For Source Install:**
```json
{
  "mcpServers": {
    "ibex35-database": {
      "command": "node",
      "args": ["/path/to/ibex35-mcp-server/dist/index.js"],
      "env": {
        "IBEX35_API_URL": "https://ibex35-api.ncdata.eu"
      }
    }
  }
}
```

**Config file locations:**
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Start Using

1. Restart Claude Desktop completely
2. Start a new conversation
3. Ask questions about IBEX 35 data!

## Available Tools

### Company Data
- `get_all_companies` - List all IBEX 35 companies with current data
- `get_company_by_symbol` - Detailed company information by symbol
- `get_companies_by_sector` - Filter companies by sector
- `get_companies_with_pe_ratio` - Filter by P/E ratio range

### Governance & Leadership  
- `get_company_directors` - Board directors for a company
- `get_board_interlocks` - Directors serving on multiple boards
- `get_directors_by_name` - Search directors across all companies

### Ownership Analysis
- `get_company_shareholders` - Shareholder structure for a company
- `get_shareholder_overlap` - Shareholders with stakes in multiple companies
- `get_top_shareholders_by_sector` - Top shareholders by sector

### Market Data
- `get_historical_prices` - Historical OHLCV data
- `get_top_performers` - Best/worst performers over period

### News & Sentiment
- `get_recent_news` - Latest news articles with sentiment
- `get_news_by_sentiment` - Filter news by sentiment (positive/negative/neutral)

### Lobbying & Transparency
- `get_lobbying_meetings` - EU lobbying meetings and activities
- `get_most_active_lobbyists` - Organizations with most lobbying activity

### Advanced Analytics
- `get_network_analysis` - Complete network analysis of governance relationships
- `get_sector_correlation_analysis` - Sector performance correlation analysis

### ⚡ **ENHANCED** AI-Powered Analysis
- `analyze_natural_query` - Process complex natural language queries with intelligent routing
- `compare_companies` - Multi-dimensional company comparison (financial, governance, performance)
- `analyze_trends` - Advanced trend analysis with forecasting (company, sector, market, correlation)
- `assess_investment_risk` - Comprehensive risk assessment (market, governance, sector, liquidity, concentration)
- `generate_analyst_report` - Professional analyst reports (company deep-dive, sector overview, governance analysis)
- `screen_opportunities` - Investment opportunity screening with custom criteria and scoring

### Reporting
- `get_weekly_reports` - Generated weekly market and governance reports
- `get_esg_scores` - ESG scores and sustainability metrics

### Custom Access
- `execute_custom_query` - Execute custom SQL queries (SELECT only)

## 💡 Example Queries

Once connected, ask Claude natural language questions about IBEX 35 data:

### Corporate Governance
```
"Show me all directors who serve on multiple IBEX 35 boards"
"Which directors have political backgrounds or government connections?"
"Find potential conflicts of interest in IBEX 35 corporate governance"
"Who are the most connected directors in the Spanish corporate network?"
```

### Financial Analysis  
```
"What are the largest IBEX 35 companies by market capitalization?"
"Show me companies with P/E ratios below 15"
"Which energy sector companies are in IBEX 35?"
"Compare the performance of banking vs telecommunications stocks"
```

### Shareholder Intelligence
```
"Find institutional investors with holdings in multiple IBEX 35 companies"
"Show me the ownership structure of Banco Santander"
"Which companies have the most concentrated ownership?"
"Identify shareholder overlaps in the energy sector"
```

### Market Performance
```
"What are the best performing IBEX 35 stocks this month?"
"Show me companies that have dropped more than 10% recently"
"Compare sector performance across IBEX 35"
"Find undervalued companies based on P/E ratios"
```

### Research & Analysis
```
"Analyze the political connections within IBEX 35 boards"
"Show me recent news sentiment for renewable energy companies"
"Which companies have the most diverse boards?"
"Find companies with suspicious governance patterns"
```

### ⚡ **ENHANCED** Natural Language Analysis
```
"Which banking stocks have grown most in the last month?"
"Show me companies with high governance risk and explain why"
"Compare Santander vs BBVA across all metrics"
"Find undervalued large-cap companies with good governance scores"
"Generate a comprehensive report on the energy sector outlook"
"What are the price trends for telecommunications stocks?"
"Assess the investment risks of the banking sector"
"Screen for opportunities: P/E under 15, market cap over 10B, exclude energy"
```

## Security

- **Read-only Access**: Database connection is read-only
- **Query Restrictions**: Only SELECT statements allowed in custom queries
- **Input Validation**: All parameters are validated and sanitized
- **No Dangerous Operations**: DROP, DELETE, UPDATE, etc. are blocked

## Database Schema

The server works with a comprehensive schema including:
- **companies**: Core company data and metrics
- **company_directors**: Board and executive information  
- **company_shareholders**: Ownership structures
- **historical_prices**: Daily OHLCV market data
- **company_news**: News articles with sentiment analysis
- **lobbying_meetings**: EU transparency and lobbying data
- **company_esg**: ESG scores and sustainability metrics
- **weekly_reports**: Generated analytical reports

## Development

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start
```

## Contributing

This MCP server is designed to work with the IBEX 35 Dashboard ecosystem. Ensure any changes maintain compatibility with the existing database schema and sync processes.

## 📊 Data Sources

This MCP server aggregates data from authoritative Spanish sources:
- **Madrid Stock Exchange (BME)** - Real-time market data and trading information
- **CNMV** - Official regulatory filings and shareholder disclosures  
- **EU Transparency Register** - Corporate lobbying activities and meetings
- **Corporate Websites** - Board compositions and governance structures
- **Financial News Sources** - Market sentiment and company-specific news

## 🔒 Privacy & Security

- **No API keys required** - Uses publicly available data sources
- **No personal data** - Only publicly disclosed corporate information
- **No tracking** - Direct API access without data collection
- **Open source** - Full transparency in data processing and analysis
- **Read-only access** - Cannot modify or delete any data

## 📈 Use Cases

### Financial Professionals
- Due diligence and investment research
- Risk assessment through governance analysis  
- Market trend identification and sector analysis
- Competitive intelligence and benchmarking

### Academic Researchers
- Corporate governance studies and analysis
- Political economy research on Spain
- Network analysis of corporate relationships
- Financial market behavior studies

### Compliance & Risk
- Board independence verification
- Political connection identification
- Ownership concentration analysis
- Governance red flag detection

### Journalists & Analysts
- Investigative research on corporate connections
- Political influence mapping
- Market analysis and reporting
- Corporate transparency assessment

## 🛠 Troubleshooting

### Claude doesn't recognize the server
1. Check config file location and JSON syntax
2. Restart Claude Desktop completely (⌘+Q, wait, reopen)
3. Verify Node.js version (18+) and installation

### Installation issues
```bash
# Check Node.js version
node --version

# Clear npm cache if needed
npm cache clean --force

# Reinstall
npm install -g ibex35-mcp-server
```

### API connectivity
The server uses public APIs - no authentication required. If you see errors:
```bash
# Test API accessibility
curl https://ibex35-api.ncdata.eu/api/companies
```

## 🤝 Contributing

Contributions welcome! Areas for enhancement:
- Additional data sources and metrics
- Performance optimizations
- New analytical capabilities
- Documentation improvements

## 📄 License

MIT License - Free for commercial and non-commercial use.

## 🔗 Related Resources

- **[IBEX 35 Dashboard](https://ibex35dashboard.com)** - Interactive web interface
- **[Model Context Protocol](https://modelcontextprotocol.io)** - Official MCP documentation  
- **[Claude Desktop](https://claude.ai/download)** - Download Claude Desktop app
- **[PulseMCP](https://pulsemcp.com)** - Discover more MCP servers

## 🌟 Support & Community

- **GitHub Issues:** Report bugs and request features
- **GitHub Discussions:** Community support and ideas
- **Web Dashboard:** Try the data through the web interface
- **Model Recommendation:** Works best with Claude 4 Sonnet

---

**Made with ❤️ for the Claude and MCP community**

*Bringing Spanish corporate intelligence to AI assistants worldwide*
