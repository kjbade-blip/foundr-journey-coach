import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildBusinessProfile, type BusinessProfile } from "./competitor-profile.server";

export const getBusinessProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ placeId: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data }): Promise<BusinessProfile | null> => buildBusinessProfile(data.placeId));
