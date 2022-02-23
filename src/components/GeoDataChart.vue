<template>
  <canvas ref="canvas" id="canvas" style="max-width: 500px"></canvas>
</template>

<script setup lang="ts">
import {
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterDataPoint,
  Plugin,
  ChartDataset,
  PluginOptionsByType,
} from "chart.js";
import Zoom, { zoom } from "chartjs-plugin-zoom";
import axios from "axios";
import { TieLineModel } from '../models/tieline';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { drawLine, Unsubscriber } from '../utils';
import { DeepPartial } from 'chart.js/types/utils';
import { DataPoint, Plot, ZoomSync } from '../models/ZoomSync';

const MAX_SCALE_X = 250;

let timer: ReturnType<typeof setTimeout>;
function toScatterPoint(point: DataPoint): ScatterDataPoint {
  // y = depth (index 0)
  // x = value (index 1)
  return { x: point[1], y: point[0] };
}

function fetchData(
  plot: Plot,
  key: string,
  min?: number,
  max?: number
): ScatterDataPoint[] {
  // TODO: Zoom levels, reduce amount of datapoints?! (see decimation plugin perhaps?)
  // Filter by depth...
  const aMin = min ?? Number.MIN_VALUE;
  const aMax = max ?? Number.MAX_VALUE;
  const result = plot.points[key]
    .filter((dp) => dp[0] > aMin && dp[0] < aMax)
    .map(toScatterPoint);
  return result;
}

/**
 * Re-fetches all the datapoints for the plot (using what the chart is displaying in its y-axis - depth)
 */
function startFetch(chart: Chart, plot: Plot): void {
  const { min, max } = chart.scales.y;
  clearTimeout(timer);
  timer = setTimeout(() => {
    // The last dataset is the tielines, do not fetch this...
    const ds = chart.data.datasets.slice(0, -1);
    ds.forEach((ds) => {
      ds.data = fetchData(plot, ds.label!, min, max);
    });
    chart.stop(); // make sure animations are not running
    chart.update("none");
  }, 500);
}

const rulerPlugin: Plugin<"line"> = {
  id: "ruler",

  beforeDraw(chart: Chart) {

    const ctx = chart.ctx.canvas.getContext("2d")!;
    const box = chart.chartArea;
    const scale = chart.scales.y;
    const ticks = scale.getTicks();
    if (ticks.length >= 3) {

      const left = box.left - 5;
      const lastTick = ticks[ticks.length - 1];
      const intervalValue = Math.abs(ticks[1].value - ticks[2].value);
      const intervalPx = Math.abs(scale.getPixelForTick(1) - scale.getPixelForTick(2));
      const offsetValue = lastTick.value % intervalValue;
      // Offset the dashes to align with start of tick line.
      const offsetPx = offsetValue * intervalPx / intervalValue;

      drawLine(
        ctx,
        {
          x: left,
          y: scale.getPixelForTick(ticks.length - 1),
        },
        {
          x: left,
          y: scale.getPixelForTick(0),
        },
        {
          color: "gray",
          width: 10,
          dashes: [intervalPx / 10, intervalPx / 10],
          lineDashOffset: offsetPx
        }
      );
    }
  },
};


interface TieLinePluginOptions {
  tielines: number[];
}

const tielinePlugin: Plugin<"line", TieLinePluginOptions> = {
  id: "tieline",
  beforeDraw(chart: Chart, _args, options) {
    if (options?.tielines?.length) {
      const ctx = chart.ctx.canvas.getContext("2d")!;
      const box = chart.chartArea;
      options.tielines.forEach((line) => {
        const y = chart.scales.y.getPixelForValue(line);
        drawLine(
          ctx,
          { x: box.left, y },
          { x: box.right, y },
          {
            color: "blue",
            width: 2,
            dashes: [],
          }
        );
      });
    }
  },
};

function createChart(canvas: HTMLCanvasElement, data: Plot): Chart {

  Chart.register(LinearScale);
  Chart.register(CategoryScale);
  Chart.register(LineController);
  Chart.register(PointElement);
  Chart.register(LineElement);
  Chart.register(Zoom);
  Chart.register(rulerPlugin);
  Chart.register(tielinePlugin);

  const colors = [
    "rgba(11,32,216,0.8)",
    "rgba(128,128,130,0.8)",
    "rgba(11,105,13,0.8)",
    "rgba(52,217,231,0.8)",
    "rgba(128,0,128,0.8)",
    "rgba(218,37,37,0.8)",
    "rgba(228,61,228,0.8)"
  ];

  const tielineOptions: TieLinePluginOptions = { tielines: [] };

  const datasets: ChartDataset<"line", any>[] = Object.keys(data.points).map(
    (key, i) => ({
      indexAxis: "y",
      label: key,
      data: fetchData(data, key),
      fill: false,
      borderColor: colors[i % colors.length],
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 18,
      pointHoverRadius: 5,
    })
  );

  const plugins: DeepPartial<PluginOptionsByType<"line">> = {
    decimation: {
      enabled: true,
      // TODO: What is an appropriate sample here (decimation to reduce amount of data shown when zooming out)
      samples: 1000,
    },
    // zoom: {
    //   zoom: {
    //     wheel: {
    //       enabled: true,
    //       modifierKey: "ctrl",
    //     },
    //     drag: {
    //       // This enables selecting an area of the chart by dragging your mouse over it. This inteferes with dragging tie lines unfortunately
    //       enabled: false,
    //       //enabled: true,
    //     },
    //     pinch: {
    //       enabled: true,
    //     },
    //     mode: "y",
    //     onZoomComplete: (ctx) => {
    //       startFetch(ctx.chart, data);
    //     },
    //   },
    //   pan: {
    //     enabled: true,
    //     mode: "y",
    //     onPanComplete: (ctx) => {
    //       startFetch(ctx.chart, data);
    //     },
    //   },
    // },
  };

  (plugins as any).tieline = tielineOptions;

  return new Chart(
    {
      canvas: canvas,
    },
    {
      type: "line",
      options: {
        plugins,
        // performance optimization: https://www.chartjs.org/docs/latest/general/performance.html#automatic-data-decimation-during-draw
        spanGaps: true,
        animation: false,
        scales: {
          y: {
            type: "linear",
            min: 0,
            max: Math.max(
              ...Object.values(data.points).map(
                (pts) => pts[pts.length - 1]?.[0] ?? 0
              )
            ), // Assume ordered by depth here last entry in each dataset should be the max depth for that dataset...
            display: true,
            alignToPixels: true,
            // Fixed size labels - stops char from jumping left then decimals start show (zooming in)
            afterFit: (x) => (x.width = 100),
            reverse: true,
          },
          x: {
            type: "linear",
            min: 0,
            // NOTE: Having a max here crops any 'outlier' plot
            max: MAX_SCALE_X,
          },
        },

        onClick: (ev, els, chart) => {
          if (els.length) {
            const el = els[0];
            const point = chart.data.datasets[el.datasetIndex].data[
              el.index
            ] as ScatterDataPoint;



            emit('depthClicked', point.y);
            // depthClickedEmit(point.y);
            // emit.depthClicked(point.y);
            // emit('dep')
            // const { tieline } = toRefs(props);
            // const model = tieline.value;
            // if (model.new) {
            //   model.commitNew(point.y, 'geoDepth');
            //   // model.new.geoDepth = point.y;
            //   // model.tieLines.push(model.new as TieLine);
            //   // delete model.new;
            // }



            const depth = point.y;
            // Adding to tieline to plugin data. Needs a refresh...
            tielineOptions.tielines.push(depth);
            chart.update("none");
          }
        },
      },
      data: {
        datasets,
      },
    }
  );
}

const props = defineProps({
  tieline: { type: TieLineModel, required: true },
  zoomSync: { type: ZoomSync, required: true }
});

// const depthClickedEmit = defineEmits<{
//   (depth: number): void,
// }>();

const emit = defineEmits<(e: 'depthClicked', arg: number) => void>();
const canvas = ref<HTMLCanvasElement>();
const unsubscriber = new Unsubscriber();

onMounted(async () => {

  const data = (await axios.get("/data/site-110317.json")).data as Plot;  
  const chart = createChart(canvas.value!, data);
  props.zoomSync.updateChartArea(chart.chartArea);

  const zoomSubscription = props.zoomSync.zoom.subscribe(z => {
    const scale = chart.scales.y as LinearScale;
    scale.options.min = z.min;
    scale.options.max = z.max;
    chart.update('none');
    startFetch(chart, data);
  });

  unsubscriber.add(() => zoomSubscription.unsubscribe());
});

onUnmounted(() => {
  unsubscriber.unsubscribe();
});


</script>

