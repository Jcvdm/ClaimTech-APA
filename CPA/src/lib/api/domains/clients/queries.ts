// src/lib/api/domains/clients/queries.ts
import { apiClient } from "../../client";
import { type QueryOptions } from "../../client";
import { type Client, type ClientListParams, type ClientListResponse } from "./types";

export const clientQueries = {
  /**
   * Get all clients (basic query)
   */
  getAll: (options?: QueryOptions<Client[]>) => 
    apiClient.query<Client[]>(
      () => apiClient.raw.client.getAll.useQuery(), 
      options
    ),
  
  /**
   * Get clients with filtering, pagination, and sorting
   */
  list: (params: ClientListParams, options?: QueryOptions<ClientListResponse>) => 
    apiClient.query<ClientListResponse>(
      () => apiClient.raw.client.list.useQuery(params), 
      options
    ),
  
  /**
   * Get a single client by ID
   */
  getById: (id: string, options?: QueryOptions<Client>) => 
    apiClient.query<Client>(
      () => apiClient.raw.client.getById.useQuery({ id }), 
      {
        enabled: !!id,
        ...options
      }
    ),
};
