import { type ArgumentMetadata, BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/** Valida o payload com um schema Zod do @labvie/domain (rastreabilidade de contrato). */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "validação falhou",
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
