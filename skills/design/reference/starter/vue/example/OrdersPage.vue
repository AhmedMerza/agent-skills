<script setup>
// Example list page on the house starter. Shows every item of the "minimum house look"
// checklist: title + tiles + filter + rows, status pills with icons, money with its currency.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import Money from '../components/Money.vue'
import StatusPill from '../components/StatusPill.vue'
import { money } from '../plugins/house'
import { orders } from '../data/orders'

const CURRENCY = 'AED'          // the app's currency; never print a bare number
const { t, locale } = useI18n()
const { smAndDown } = useDisplay()

// One tone and one icon per status, decided once.
const STATUS = {
  pending:   { tone: 'warn', icon: 'mdi-clock-outline' },
  paid:      { tone: 'info', icon: 'mdi-credit-card-check-outline' },
  shipped:   { tone: 'move', icon: 'mdi-truck-fast-outline' },
  delivered: { tone: 'good', icon: 'mdi-check-circle-outline' },
  cancelled: { tone: 'bad',  icon: 'mdi-close-circle-outline' },
  refunded:  { tone: 'calm', icon: 'mdi-cash-refund' },
}
const filter = ref('all')
const sorted = [...orders].sort((a, b) => b.date.localeCompare(a.date))
const rows = computed(() => filter.value === 'all' ? sorted : sorted.filter(o => o.status === filter.value))
const count = s => orders.filter(o => o.status === s).length
const sum = list => list.reduce((n, o) => n + o.total, 0)
const kept = orders.filter(o => !['cancelled', 'refunded'].includes(o.status))
const open = orders.filter(o => ['pending', 'paid'].includes(o.status))
const lost = orders.filter(o => ['cancelled', 'refunded'].includes(o.status))

const fmt = v => money(v, CURRENCY, locale.value)
const day = d => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', numberingSystem: 'latn' }).format(new Date(d))
const initials = n => { const w = n.trim().split(/\s+/); return /[\u0600-\u06ff]/.test(n) ? [...w[0]][0] : (w[0][0] + (w[1]?.[0] ?? '')).toUpperCase() }
</script>

<template>
  <div class="house-page">
    <header class="orders-head">
      <div>
        <h1 class="house-title" v-enter="'title'">{{ t('orders.title') }}</h1>
        <p class="house-sub" v-enter="'content'">
          {{ t('orders.count', { n: orders.length }) }} · <b>{{ t('orders.toFulfil', { n: open.length }) }}</b>
        </p>
      </div>
      <div class="orders-actions" v-enter="'content'">
        <v-btn variant="outlined" prepend-icon="mdi-tray-arrow-down">{{ t('orders.export') }}</v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus">{{ t('orders.new') }}</v-btn>
      </div>
    </header>

    <section class="house-grid">
      <article class="house-tile house-tile--feature house-lift" v-enter="'card'">
        <div class="house-tile__head"><span class="house-tile__icon"><v-icon icon="mdi-cash-multiple" size="18" /></span>{{ t('orders.revenue') }}</div>
        <div class="house-tile__value"><Money :value="sum(kept)" :currency="CURRENCY" :locale="locale" /></div>
        <div class="house-tile__note">{{ t('orders.count', { n: kept.length }) }}</div>
      </article>
      <article class="house-tile house-tile--tint house-lift" v-enter="'card'">
        <div class="house-tile__head"><span class="house-tile__icon"><v-icon icon="mdi-package-variant" size="18" /></span>{{ t('orders.open') }}</div>
        <div class="house-tile__value">{{ open.length }}</div>
        <div class="house-tile__note">{{ fmt(sum(open)) }}</div>
      </article>
      <article class="house-tile house-lift" v-enter="'card'">
        <div class="house-tile__head"><span class="house-tile__icon"><v-icon icon="mdi-truck-fast-outline" size="18" /></span>{{ t('orders.moving') }}</div>
        <div class="house-tile__value">{{ count('shipped') }}</div>
        <div class="house-tile__note">{{ t('orders.deliveredN', { n: count('delivered') }) }}</div>
      </article>
      <article class="house-tile house-lift" v-enter="'card'">
        <div class="house-tile__head"><span class="house-tile__icon"><v-icon icon="mdi-cash-refund" size="18" /></span>{{ t('orders.lost') }}</div>
        <div class="house-tile__value" :class="{ 'orders-bad': lost.length }">{{ lost.length }}</div>
        <div class="house-tile__note">{{ fmt(sum(lost)) }}</div>
      </article>
    </section>

    <div class="house-seg orders-filter" role="group" :aria-label="t('orders.filter')" v-enter="'content'">
      <button :aria-pressed="filter === 'all'" @click="filter = 'all'">{{ t('orders.all') }} <span class="house-count">{{ orders.length }}</span></button>
      <button v-for="(s, key) in STATUS" :key="key" :aria-pressed="filter === key" @click="filter = key">
        {{ t(`status.${key}`) }} <span class="house-count">{{ count(key) }}</span>
      </button>
    </div>

    <section class="house-card orders-card" v-enter="'card'">
      <table v-if="!smAndDown" class="house-rows">
        <thead>
          <tr><th>{{ t('orders.order') }}</th><th>{{ t('orders.customer') }}</th><th>{{ t('orders.date') }}</th><th>{{ t('orders.status') }}</th><th class="is-end">{{ t('orders.total') }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="o in rows" :key="o.id" v-enter="'row'">
            <td class="house-strong house-num" dir="ltr">{{ o.id }}</td>
            <td><div class="orders-who"><span class="house-avatar" aria-hidden="true">{{ initials(o.customer) }}</span><bdi class="house-strong house-clip" :title="o.customer">{{ o.customer }}</bdi></div></td>
            <td class="house-muted house-num">{{ day(o.date) }}</td>
            <td><StatusPill :tone="STATUS[o.status].tone" :icon="STATUS[o.status].icon">{{ t(`status.${o.status}`) }}</StatusPill></td>
            <td class="is-end"><Money :value="o.total" :currency="CURRENCY" :locale="locale" /></td>
          </tr>
        </tbody>
      </table>
      <ul v-else class="orders-list">
        <li v-for="o in rows" :key="o.id" v-enter="'row'">
          <span class="house-avatar" aria-hidden="true">{{ initials(o.customer) }}</span>
          <div class="orders-list__main">
            <bdi class="house-strong house-wrap">{{ o.customer }}</bdi>
            <span class="house-muted house-num orders-meta"><span dir="ltr">{{ o.id }}</span> · {{ day(o.date) }}</span>
          </div>
          <div class="orders-list__end">
            <Money :value="o.total" :currency="CURRENCY" :locale="locale" />
            <StatusPill :tone="STATUS[o.status].tone" :icon="STATUS[o.status].icon">{{ t(`status.${o.status}`) }}</StatusPill>
          </div>
        </li>
      </ul>
      <p v-if="!rows.length" class="house-muted orders-empty">{{ t('orders.none') }}</p>
    </section>
  </div>
</template>

<style scoped>
.orders-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 18px 0 22px; }
.orders-actions { display: flex; gap: 10px; }
.orders-filter { margin: 22px 0 14px; }
.orders-card { padding: 18px 8px 8px; }
.orders-who { display: flex; align-items: center; gap: 10px; min-width: 0; }
.orders-bad { color: var(--house-bad-text); }
.orders-list { list-style: none; margin: 0; padding: 0; }
.orders-list li { display: flex; align-items: center; gap: 12px; padding: 13px 10px; }
.orders-list li + li { border-top: 1px solid var(--house-line); }
.orders-list__main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.orders-meta { font-size: 12.5px; }
.orders-list__end { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex: none; }
.orders-empty { padding: 28px; text-align: center; margin: 0; }
@media (max-width: 480px) { .orders-actions { width: 100%; } .orders-actions > * { flex: 1; } .orders-card { padding: 6px 4px; } }
</style>
