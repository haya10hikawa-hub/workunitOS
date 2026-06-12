export type TenantId = string & { readonly __brand: "TenantId" }
export type UserId = string & { readonly __brand: "UserId" }
export type WorkUnitId = string & { readonly __brand: "WorkUnitId" }

export type Tenant = {
  id: TenantId
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}
