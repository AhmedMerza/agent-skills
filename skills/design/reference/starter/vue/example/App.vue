<script setup>
// Example shell on the house starter: blurred bar, brand mark, segmented nav (a floating bottom
// pill on phones), language and theme controls. Replace the brand and the nav items.
import { useI18n } from 'vue-i18n'
import { useLocale, useTheme } from 'vuetify'
import { switchTheme } from './motion/entrance'

const { t, locale } = useI18n()
const theme = useTheme()
const vLocale = useLocale()
const nav = [
  { to: '/', key: 'nav.home', icon: 'mdi-view-dashboard-outline' },
  { to: '/orders', key: 'nav.orders', icon: 'mdi-package-variant-closed' },
]
function setLang(l) {
  const go = () => {
    locale.value = vLocale.current.value = l
    document.documentElement.lang = l
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
  }
  document.startViewTransition ? document.startViewTransition(go) : go()   // plain crossfade, no circle
}
function toggleTheme(e) {
  switchTheme(() => { theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark' }, e.currentTarget)
}
</script>
<template>
  <v-app>
    <header class="house-bar">
      <div class="house-brand" v-enter="'content'">
        <span class="house-brand__mark"><v-icon icon="mdi-storefront-outline" size="20" /></span>
        <span>{{ t('app.name') }}</span>
      </div>
      <v-spacer />
      <nav v-travel-nav class="house-seg house-nav" :aria-label="t('nav.label')">
        <router-link v-for="n in nav" :key="n.to" :to="n.to" exact-active-class="is-active">
          <v-icon :icon="n.icon" size="18" />{{ t(n.key) }}
        </router-link>
      </nav>
      <v-spacer />
      <button class="house-icon-btn" :aria-label="t('app.language')" @click="setLang(locale === 'en' ? 'ar' : 'en')">
        {{ locale === 'en' ? 'ع' : 'EN' }}
      </button>
      <button class="house-icon-btn" :aria-label="t('app.theme')" @click="toggleTheme">
        <v-icon :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'" size="19" />
      </button>
    </header>
    <v-main><router-view /></v-main>
  </v-app>
</template>
