<template>
--{{ tieline.tieLines.length}}--
<table class="table">
    <th>
      <td>Geo</td>
      <td>Lit</td>
      <td>Diff</td>
    </th>
    <tr class="table-row" v-for="tie in tieline.tieLines">
      <td>{{tie.geoDepth}}</td>
      <td>{{tie.litDepth}}</td>
      <td>{{tie.geoDepth - tie.litDepth}}</td>
    </tr>
  </table>
</template>

<script setup lang="ts">
import { TieLineModel } from '../models/tieline';
const props = defineProps({
  tieline: { type: TieLineModel, required: true }
});

</script>
