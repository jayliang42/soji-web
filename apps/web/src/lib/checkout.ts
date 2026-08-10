import { z } from "zod";

export const subscriptionCheckoutPayloadSchema = z
  .object({
    planId: z.enum(["tier_1"]),
    requestId: z.string().uuid()
  })
  .strict();

export const productCheckoutPayloadSchema = z
  .object({
    productSlug: z
      .string()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    requestId: z.string().uuid()
  })
  .strict();

export function shouldRotateCheckoutRequestId(status: number) {
  return status >= 400 && status < 500;
}
