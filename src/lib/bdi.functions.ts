import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { BDIResult } from "./bdi";

export const getLocationBDI = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().min(200).max(5000).default(1200),
        locationName: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ result: BDIResult; narrative: string }> => {
    const { collectBDI } = await import("./bdi.server");
    return collectBDI(data.lat, data.lng, data.radius, data.locationName);
  });
