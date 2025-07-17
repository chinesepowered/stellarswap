#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DefindexClient } from './defindex-client.js';

class DefindexServer {
  private server: Server;
  private defindexClient: DefindexClient;

  constructor() {
    this.server = new Server(
      {
        name: 'defindex-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize with testnet by default, can be configured via environment variables
    const network = (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const apiKey = process.env.DEFINDEX_API_KEY;
    
    this.defindexClient = new DefindexClient(network, apiKey);
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_available_vaults',
            description: 'Get list of available DeFindex vaults',
            inputSchema: {
              type: 'object',
              properties: {
                riskLevel: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'Filter by risk level',
                },
                minApy: {
                  type: 'string',
                  description: 'Minimum APY percentage',
                },
              },
            },
          },
          {
            name: 'get_vault_details',
            description: 'Get detailed information about a specific vault',
            inputSchema: {
              type: 'object',
              properties: {
                vaultAddress: {
                  type: 'string',
                  description: 'Vault contract address',
                },
              },
              required: ['vaultAddress'],
            },
          },
          {
            name: 'get_yield_strategies',
            description: 'Get available yield strategies',
            inputSchema: {
              type: 'object',
              properties: {
                riskLevel: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'Filter by risk level',
                },
                protocol: {
                  type: 'string',
                  description: 'Filter by protocol name',
                },
              },
            },
          },
          {
            name: 'calculate_vault_deposit',
            description: 'Calculate expected returns for vault deposit',
            inputSchema: {
              type: 'object',
              properties: {
                vaultAddress: {
                  type: 'string',
                  description: 'Vault contract address',
                },
                depositAmount: {
                  type: 'string',
                  description: 'Amount to deposit',
                },
                timeframe: {
                  type: 'string',
                  description: 'Investment timeframe (e.g., "30d", "1y")',
                  default: '1y',
                },
              },
              required: ['vaultAddress', 'depositAmount'],
            },
          },
          {
            name: 'get_portfolio_performance',
            description: 'Get portfolio performance metrics',
            inputSchema: {
              type: 'object',
              properties: {
                userAddress: {
                  type: 'string',
                  description: 'User wallet address',
                },
                timeframe: {
                  type: 'string',
                  description: 'Performance timeframe (e.g., "7d", "30d", "1y")',
                  default: '30d',
                },
              },
              required: ['userAddress'],
            },
          },
          {
            name: 'get_user_positions',
            description: 'Get user positions across all vaults',
            inputSchema: {
              type: 'object',
              properties: {
                userAddress: {
                  type: 'string',
                  description: 'User wallet address',
                },
              },
              required: ['userAddress'],
            },
          },
          {
            name: 'optimize_yield_allocation',
            description: 'Get optimal yield allocation recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                totalAmount: {
                  type: 'string',
                  description: 'Total amount to allocate',
                },
                riskTolerance: {
                  type: 'string',
                  enum: ['conservative', 'moderate', 'aggressive'],
                  description: 'Risk tolerance level',
                },
                timeHorizon: {
                  type: 'string',
                  description: 'Investment time horizon (e.g., "6m", "1y", "2y")',
                  default: '1y',
                },
              },
              required: ['totalAmount', 'riskTolerance'],
            },
          },
          {
            name: 'get_vault_analytics',
            description: 'Get analytics and historical performance for a vault',
            inputSchema: {
              type: 'object',
              properties: {
                vaultAddress: {
                  type: 'string',
                  description: 'Vault contract address',
                },
                period: {
                  type: 'string',
                  description: 'Analytics period (e.g., "7d", "30d", "90d")',
                  default: '30d',
                },
              },
              required: ['vaultAddress'],
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_available_vaults':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getAvailableVaults(args?.riskLevel as string, args?.minApy as string),
                },
              ],
            };

          case 'get_vault_details':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getVaultDetails(args?.vaultAddress as string),
                },
              ],
            };

          case 'get_yield_strategies':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getYieldStrategies(args?.riskLevel as string, args?.protocol as string),
                },
              ],
            };

          case 'calculate_vault_deposit':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.calculateVaultDeposit(
                    args?.vaultAddress as string,
                    args?.depositAmount as string,
                    (args?.timeframe as string) || '1y'
                  ),
                },
              ],
            };

          case 'get_portfolio_performance':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getPortfolioPerformance(
                    args?.userAddress as string,
                    (args?.timeframe as string) || '30d'
                  ),
                },
              ],
            };

          case 'get_user_positions':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getUserPositions(args?.userAddress as string),
                },
              ],
            };

          case 'optimize_yield_allocation':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.optimizeYieldAllocation(
                    args?.totalAmount as string,
                    args?.riskTolerance as string,
                    (args?.timeHorizon as string) || '1y'
                  ),
                },
              ],
            };

          case 'get_vault_analytics':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getVaultAnalytics(
                    args?.vaultAddress as string,
                    (args?.period as string) || '30d'
                  ),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async getAvailableVaults(riskLevel?: string, minApy?: string): Promise<string> {
    try {
      const vaults = await this.defindexClient.getAvailableVaults(
        riskLevel as 'low' | 'medium' | 'high',
        minApy
      );
      
      const totalTvl = vaults.reduce((sum, vault) => sum + parseFloat(vault.totalAssets), 0);
      
      return JSON.stringify({
        vaults,
        total: vaults.length,
        totalTvl: totalTvl.toString(),
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch available vaults',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getVaultDetails(vaultAddress: string): Promise<string> {
    try {
      const vault = await this.defindexClient.getVaultDetails(vaultAddress);
      
      return JSON.stringify({
        vault,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch vault details',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getYieldStrategies(riskLevel?: string, protocol?: string): Promise<string> {
    try {
      const strategies = await this.defindexClient.getYieldStrategies(
        riskLevel as 'low' | 'medium' | 'high',
        protocol
      );
      
      return JSON.stringify({
        strategies,
        total: strategies.length,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch yield strategies',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }
  private async getPortfolioPerformance(
    userAddress: string,
    timeframe: string
  ): Promise<string> {
    try {
      const performance = await this.defindexClient.getPortfolioPerformance(userAddress, timeframe);
      
      return JSON.stringify({
        ...performance,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch portfolio performance',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async calculateVaultDeposit(
    vaultAddress: string,
    depositAmount: string,
    timeframe: string
  ): Promise<string> {
    try {
      const calculation = await this.defindexClient.calculateVaultDeposit(
        vaultAddress,
        depositAmount,
        timeframe
      );
      
      return JSON.stringify({
        ...calculation,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to calculate vault deposit',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getVaultAnalytics(
    vaultAddress: string,
    period: string
  ): Promise<string> {
    try {
      const analytics = await this.defindexClient.getVaultAnalytics(vaultAddress, period);
      
      return JSON.stringify({
        ...analytics,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch vault analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getUserPositions(userAddress: string): Promise<string> {
    try {
      const positions = await this.defindexClient.getUserPositions(userAddress);
      
      const totalValue = positions.reduce((sum, position) => {
        return sum + parseFloat(position.underlyingValue);
      }, 0);
      
      return JSON.stringify({
        userAddress,
        positions,
        totalPositions: positions.length,
        totalValue: totalValue.toString(),
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch user positions',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async optimizeYieldAllocation(
    totalAmount: string,
    riskTolerance: string,
    timeHorizon: string
  ): Promise<string> {
    try {
      const optimization = await this.defindexClient.optimizeYieldAllocation(
        totalAmount,
        riskTolerance as 'conservative' | 'moderate' | 'aggressive',
        timeHorizon
      );
      
      return JSON.stringify({
        ...optimization,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to optimize yield allocation',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }


  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DeFindex MCP server running on stdio');
  }
}

const server = new DefindexServer();
server.run().catch(console.error);