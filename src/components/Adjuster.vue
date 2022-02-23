<template>
  <pre>
    zoom: alt + wheel
    scoll: mouse wheel over litography or geophysics
  </pre>
  <div v-if="state.zoomSync">
    <div class="relative flex items-stretch" ref="container" v-on:wheel="wheel">
      <GeoDataChart
        :tieline="tieline"
        :zoomSync="state.zoomSync"
        @depthClicked="depthClicked($event, 'geoDepth')"
      />
      <Litography :tieline="tieline" :zoomSync="state.zoomSync" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { TieLine, TieLineModel } from '../models/tieline';
import { Unsubscriber } from '../utils';
import Litography from './Litography.vue';
import GeoDataChart from './GeoDataChart.vue';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { Lithology, Plot, ZoomSync } from '../models/ZoomSync';
import axios from 'axios';
const tieline = new TieLineModel();
// let zoomSync: ZoomSync;
const state: { zoomSync?: ZoomSync } = reactive({});

// const data = {
//   tieline: new TieLineModel()
// }
const container = ref();
const unsubscriber = new Unsubscriber();

function depthClicked(depth: number, type: keyof TieLine) {
  if (tieline.new) {
    tieline.commitNew(depth, type)
    console.log(tieline.tieLines);
  }
}

onMounted(async () => {
  const data = (await axios.get("/data/site-110317.json")).data as Plot;
  const lithology = (await axios.get("/data/lithology-110317.json")).data as Lithology;
  const zoomSync = new ZoomSync(data, lithology);
  state.zoomSync = zoomSync;

  // console.log(container.value);

  // const c = useWheel(ev => {
  //   const delta = ev.delta[1];
  //   if (delta === 0) { return; }
  //   const zoomFactor = delta > 0 ? 0.9 : 1.1;
  //   zoomSync.doZoom(zoomFactor);
  // }, { domTarget: container, rubberband: false });

  // unsubscriber.add(() => c.clean());
})

function wheel(ev: WheelEvent) {
  const delta = ev.deltaY;
  if (delta === 0) { return; }
  if (ev.altKey) {
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    state.zoomSync?.doZoom(zoomFactor);
  } else {
    const htmlElement = ev.currentTarget as HTMLElement;
    const height = htmlElement.clientHeight;
    const factor = delta / height;
    state.zoomSync?.scroll(factor);
  }

}

onUnmounted(() => unsubscriber.unsubscribe());

</script>

