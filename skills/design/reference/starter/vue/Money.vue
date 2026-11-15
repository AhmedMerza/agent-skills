<script setup>
// Money never prints without its currency. Urbanist has no tabular figures (no `tnum`; its "1"
// is half as wide as its "0"), so each digit sits in a fixed-width box: columns of amounts
// line up and a count-up does not jitter. Latin digits in both locales.
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  currency: { type: String, required: true },
  locale: { type: String, default: 'en' },
})
const parts = computed(() => {
  const all = new Intl.NumberFormat(props.locale, { style: 'currency', currency: props.currency, numberingSystem: 'latn' })
    .formatToParts(props.value)
  const figure = all.filter(p => !['currency', 'literal'].includes(p.type)).map(p => p.value).join('')
  return { label: all.map(p => p.value).join(''), unit: all.find(p => p.type === 'currency').value, figure: [...figure] }
})
</script>
<template>
  <span class="house-money">
    <span class="house-sr">{{ parts.label }}</span>
    <span aria-hidden="true" class="house-money__unit">{{ parts.unit }}</span>
    <span aria-hidden="true" class="house-money__figure"><template v-for="(ch, i) in parts.figure" :key="i"><span v-if="ch >= '0' && ch <= '9'" class="house-digit">{{ ch }}</span><template v-else>{{ ch }}</template></template></span>
  </span>
</template>
