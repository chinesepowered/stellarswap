#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SoroswapClient } from './soroswap-client.js';

class SoroswapServer {
  private server: Server;
  private soroswapClient: SoroswapClient;

  constructor() {
    this.server = new Server(
      {
        name: 'soroswap-server',
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
    const apiKey = process.env.SOROSWAP_API_KEY;
    
    this.soroswapClient = new SoroswapClient(network, apiKey);
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_token_pairs',
            description: 'Get available trading pairs on Soroswap',
            inputSchema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'Optional token address to filter pairs',
                },
              },
            },
          },
          {
            name: 'get_swap_quote',
            description: 'Get a quote for swapping tokens',
            inputSchema: {
              type: 'object',
              properties: {
                tokenIn: {
                  type: 'string',
                  description: 'Input token address',
                },
                tokenOut: {
                  type: 'string',
                  description: 'Output token address',
                },
                amountIn: {
                  type: 'string',
                  description: 'Amount to swap in',
                },
                slippage: {
                  type: 'string',
                  description: 'Slippage tolerance (e.g., "0.5" for 0.5%)',
                  default: '0.5',
                },
              },
              required: ['tokenIn', 'tokenOut', 'amountIn'],
            },
          },
          {
            name: 'get_liquidity_pools',
            description: 'Get liquidity pool information',
            inputSchema: {
              type: 'object',
              properties: {
                pairAddress: {
                  type: 'string',
                  description: 'Optional pair address to get specific pool info',
                },
              },
            },
          },
          {
            name: 'calculate_liquidity_provision',
            description: 'Calculate liquidity provision requirements',
            inputSchema: {
              type: 'object',
              properties: {
                tokenA: {
                  type: 'string',
                  description: 'First token address',
                },
                tokenB: {
                  type: 'string',
                  description: 'Second token address',
                },
                amountA: {
                  type: 'string',
                  description: 'Amount of token A to provide',
                },
              },
              required: ['tokenA', 'tokenB', 'amountA'],
            },
          },
          {
            name: 'get_token_price',
            description: 'Get current token price in USD or relative to another token',
            inputSchema: {
              type: 'object',
              properties: {
                tokenAddress: {
                  type: 'string',
                  description: 'Token address to get price for',
                },
                baseCurrency: {
                  type: 'string',
                  description: 'Base currency (USD, XLM, etc.)',
                  default: 'USD',
                },
              },
              required: ['tokenAddress'],
            },
          },
          {
            name: 'get_user_positions',
            description: 'Get user liquidity positions',
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
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_token_pairs':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getTokenPairs(args?.token as string),
                },
              ],
            };

          case 'get_swap_quote':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getSwapQuote(
                    args?.tokenIn as string,
                    args?.tokenOut as string,
                    args?.amountIn as string,
                    (args?.slippage as string) || '0.5'
                  ),
                },
              ],
            };

          case 'get_liquidity_pools':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getLiquidityPools(args?.pairAddress as string),
                },
              ],
            };

          case 'calculate_liquidity_provision':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.calculateLiquidityProvision(
                    args?.tokenA as string,
                    args?.tokenB as string,
                    args?.amountA as string
                  ),
                },
              ],
            };

          case 'get_token_price':
            return {
              content: [
                {
                  type: 'text',
                  text: await this.getTokenPrice(
                    args?.tokenAddress as string,
                    (args?.baseCurrency as string) || 'USD'
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

  private async getTokenPairs(token?: string): Promise<string> {
    try {
      const pairs = await this.soroswapClient.getTokenPairs(token);
      
      return JSON.stringify({
        pairs,
        total: pairs.length,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch token pairs',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippage: string
  ): Promise<string> {
    try {
      const quote = await this.soroswapClient.getSwapQuote(tokenIn, tokenOut, amountIn, slippage);
      
      return JSON.stringify({
        quote,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch swap quote',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getLiquidityPools(pairAddress?: string): Promise<string> {
    try {
      const pools = await this.soroswapClient.getLiquidityPools(pairAddress);
      
      return JSON.stringify({
        pools: pairAddress ? pools.find(pool => pool.pairAddress === pairAddress) : pools,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch liquidity pools',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async calculateLiquidityProvision(
    tokenA: string,
    tokenB: string,
    amountA: string
  ): Promise<string> {
    // Mock implementation - in real implementation, this would use Soroswap Library
    const mockCalculation = {
      tokenA,
      tokenB,
      amountA,
      requiredAmountB: (parseFloat(amountA) * 0.5).toString(), // Mock 2:1 ratio
      expectedLPTokens: (parseFloat(amountA) * 0.707).toString(), // Mock LP calculation
      shareOfPool: '0.05',
    };

    return JSON.stringify({
      calculation: mockCalculation,
      message: 'Note: This is mock data. In production, this would use Soroswap Library calculations.',
    }, null, 2);
  }

  private async getTokenPrice(tokenAddress: string, baseCurrency: string): Promise<string> {
    try {
      const priceData = await this.soroswapClient.getTokenPrice(tokenAddress, baseCurrency);
      
      return JSON.stringify({
        priceData,
        network: process.env.STELLAR_NETWORK || 'testnet',
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch token price',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using mock data due to API unavailability',
      }, null, 2);
    }
  }

  private async getUserPositions(userAddress: string): Promise<string> {
    try {
      const positions = await this.soroswapClient.getUserPositions(userAddress);
      
      const totalValue = positions.reduce((sum, position) => {
        return sum + (parseFloat(position.value) || 0);
      }, 0);
      
      return JSON.stringify({
        userAddress,
        positions,
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Soroswap MCP server running on stdio');
  }
}

const server = new SoroswapServer();
server.run().catch(console.error);