<template>
  <div class="relative overflow-y-hidden overflow-x-visible w-60" ref="container">
    <div
      v-for="sec in renderSections"
      :key="sec.id"
      class="absolute"
      :style="sec.style"
      v-bind:class="['bg-' + sec.kind]"
      v-on:mouseover="mouseOver($event, sec)"
    ></div>
    <div
      v-if="tooltip.visible"
      v-bind:style="{ top: tooltip.top }"
      class="absolute whitespace-nowrap left-8"
    >{{ tooltip.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, toRefs } from 'vue';
import { TieLineModel } from '../models/tieline';
import { Area, MinMax, ZoomSync } from '../models/ZoomSync';
import { Unsubscriber } from '../utils';

const colorMap = {
  st: 'blue',
  s2: 'yellow',
  c6: 'black'
}

const props = defineProps({
  tieline: { type: TieLineModel, required: true },
  zoomSync: { type: ZoomSync, required: true }
});

const depthToPx = 2;


interface Section {
  startDepth: number;
  endDepth: number;
  id: string;
  // kind: keyof typeof colorMap;
  kind: string;
  style: { [key: string]: string }
}
interface Section {
  startDepth: number;
  endDepth: number;
  id: string;
  // kind: keyof typeof colorMap;
  kind: string;
}
// const sections: Section[] = [{
//   startDepth: 0,
//   endDepth: 110,
//   id: '0',
//   kind: 'st'
// }, {
//   startDepth: 111,
//   endDepth: 180,
//   id: '1',
//   kind: 's2',
// }, {
//   startDepth: 181,
//   endDepth: 202,
//   id: '2',
//   kind: 'c6'
// }];

const container = ref();


function calculateStyle(data: Section, range: MinMax & Area) {
  const el = container.value as HTMLElement;
  // Use margins to position litography to the top and bottom of the chart...
  el.style.marginTop = range.top + 'px';
  // el.style.marginBottom = range.bottom + 'px';
  // Range height will be the chart's height
  // TODO: The factor could come with the event...
  const clientHeight = range.height;
  const factor = clientHeight / (range.max - range.min);

  return {
    height: `${(data.endDepth - data.startDepth) * factor}px`,
    top: `${(data.startDepth - range.min) * factor}px`,
    // background: colorMap[data.kind],
    width: '30px'
  }
}


// function calculateStyle(data: Section, range: MinMax & Area) {
//   const el = container.value as HTMLElement;
//   const clientHeight = el.clientHeight;
//   const factor = clientHeight / (range.max - range.min);

//   return {
//     height: `${(data.endDepth - data.startDepth) * factor}px`,
//     top: `${(data.startDepth - range.min) * factor}px`,
//     background: colorMap[data.kind],
//     width: '20px'
//   }
// }

//const renderSections = sections.map(x => reactive({ ...x, style: { top: '0px', height: '60px', background: 'blue' } as { [key: string]: string } }));
const renderSections: Section[] = reactive([]);

function addTieLine(section: Section) {
  const { tieline } = toRefs(props)
  tieline.value.addNew(section.startDepth, 'litDepth');
}


const unsubscribe = new Unsubscriber();

onMounted(() => {

  renderSections.push(...props.zoomSync.lithology.lithology.map((x, i) => reactive(
    {
      startDepth: x[0],
      endDepth: x[1],
      kind: x[2],
      id: `${i}`,
      style: { top: '0px', height: '60px', background: 'blue' } as { [key: string]: string }
    })));


  const zoomSubscription = props.zoomSync.areaChanges.subscribe(area => {
    renderSections.forEach(section => section.style = calculateStyle(section, area));
  });

  unsubscribe.add(() => zoomSubscription.unsubscribe());
});

onUnmounted(() => {
  unsubscribe.unsubscribe();
})

const tooltip = reactive({ message: '', top: '', visible: false });
let tooltipOff = 0;
function mouseOver(event: MouseEvent, sec: Section) {
  tooltip.message = `${sec.kind} (${sec.startDepth}-${sec.endDepth})`;
  tooltip.visible = true;
  tooltip.top = sec.style.top;

  console.log('Mouse over', sec.kind)
  if (tooltipOff) {
    clearTimeout(tooltipOff);
  }
  tooltipOff = setTimeout(() => {
    tooltip.visible = false;
  }, 3000);
}

</script>

<style scoped>
.bg-NL {
  background-image: radial-gradient(#a6664d 2px, transparent 2px),
    radial-gradient(#a6664d 2px, transparent 2px);
  background-size: 10px 10px;
  background-position: 0 0, 5px 5px;
  background-color: #bfbf29;
}
.bg-s2 {
  background-image: radial-gradient(#ab5995 4px, transparent 4px),
    radial-gradient(#ab5995 4px, transparent 4px);
  background-size: 23px 23px;
  background-position: 0 0, 11.5px 11.5px;
  background-color: #4f0659;
}
.bg-c6 {
  background: radial-gradient(
        circle,
        transparent 20%,
        #3d3a7b 20%,
        #3d3a7b 80%,
        transparent 80%,
        transparent
      )
      0% 0% / 34px 34px,
    radial-gradient(
        circle,
        transparent 20%,
        #3d3a7b 20%,
        #3d3a7b 80%,
        transparent 80%,
        transparent
      )
      17px 17px / 34px 34px,
    linear-gradient(#19194e 1px, transparent 1px) 0px -0.5px / 17px 17px,
    linear-gradient(90deg, #19194e 1px, #3d3a7b 1px) -0.5px 0px / 17px 17px #3d3a7b;
  background-color: #3d3a7b;
}

.bg-SO {
  background-color: #8ff279;
}
.bg-NL {
  background-color: #f27998;
}
.bg-CF {
  background-color: #79f2ce;
}
.bg-CO {
  background-color: #000000;
}
.bg-ST {
  background-color: #79f2df;
}
.bg-MS {
  background-color: #79e5f2;
}
.bg-SD {
  background-color: #aa79f2;
}
.bg-CM {
  background-color: #f2799e;
}
.bg-TF {
  background-color: #a179f2;
}
.bg-C4 {
  background-color: #f2a679;
}
.bg-C5 {
  background-color: #f2d479;
}
.bg-C3 {
  background-color: #3d3a7b;
}
.bg-LC {
  background-color: #3d3a7b;
}
.bg-C2 {
  background-color: #3d3a7b;
}
.bg-C1 {
  background-color: #3d3a7b;
}
.bg-S2 {
  background-color: #3d3a7b;
}
.bg-S1 {
  background-color: #3d3a7b;
}
.bg-BR {
  background-color: #3d3a7b;
}
.bg-CS {
  background-color: #3d3a7b;
}
.bg-PY {
  background-color: #3d3a7b;
}
.bg-LO {
  background-color: #3d3a7b;
}
.bg-S3 {
  background-color: #3d3a7b;
}
.bg-S4 {
  background-color: #3d3a7b;
}
.bg-XT {
  background-color: #3d3a7b;
}
.bg-CY {
  background-color: #3d3a7b;
}
.bg-S7 {
  background-color: #3d3a7b;
}
</style>