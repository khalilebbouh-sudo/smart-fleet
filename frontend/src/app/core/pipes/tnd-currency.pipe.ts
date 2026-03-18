import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tnd',
  standalone: true,
})
export class TndCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, digits: number = 2): string {
    const num = typeof value === 'string' ? Number(value) : value;
    const safe = Number.isFinite(num as number) ? (num as number) : 0;

    // Tunisia: TND, decimal separator tends to be ',' in fr-TN.
    const formatted = safe.toLocaleString('fr-TN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

    return `${formatted} DT`;
  }
}

