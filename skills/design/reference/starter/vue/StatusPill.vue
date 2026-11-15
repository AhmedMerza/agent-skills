<script setup>
// Status as a tonal pill: tint + same-hue text tone + an icon. Map each status of the domain to
// one tone ONCE (one meaning per hue across the app) and pass it here.
// tone: 'good' | 'warn' | 'bad' | 'info' | 'move' | 'accent' | 'calm'
defineProps({ tone: { type: String, default: 'calm' }, icon: { type: String, default: '' } })
</script>
<template>
  <span class="house-pill" :class="`house-pill--${tone}`">
    <v-icon v-if="icon" :icon="icon" size="14" />
    <slot />
  </span>
</template>
