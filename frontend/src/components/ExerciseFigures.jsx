function Stage() {
  return (
    <g className="ex-stage" aria-hidden="true">
      <rect className="ex-stage-wash" x="0" y="0" width="240" height="180" />
      <line className="ex-horizon" x1="16" y1="158" x2="224" y2="158" />
      <ellipse className="ex-shadow" cx="120" cy="164" rx="78" ry="6" />
    </g>
  )
}

function Head({ cx, cy }) {
  return <ellipse className="ex-head" cx={cx} cy={cy} rx="11" ry="12" />
}

export function PushUpFigure() {
  return (
    <g className="fig fig-pushup">
      <Stage />
      <g className="pu-chain">
        <ellipse className="ex-grip" cx="70" cy="156" rx="10" ry="3.5" />
        <g className="pu-forearm">
          <rect className="ex-limb" x="63" y="126" width="14" height="32" rx="7" />
          <g className="pu-arm">
            <rect className="ex-limb" x="63" y="98" width="14" height="32" rx="7" />
            <g className="pu-body">
              <Head cx="42" cy="100" />
              <rect className="ex-torso" x="50" y="96" width="88" height="18" rx="9" />
              <g className="pu-thigh">
                <rect className="ex-limb" x="130" y="102" width="42" height="14" rx="7" />
                <g className="pu-shin">
                  <rect className="ex-limb" x="166" y="114" width="14" height="42" rx="7" />
                  <ellipse className="ex-grip" cx="184" cy="156" rx="11" ry="3.5" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  )
}

export function SquatFigure() {
  return (
    <g className="fig fig-squat">
      <Stage />
      <g className="sq-chain">
        <ellipse className="ex-grip" cx="118" cy="156" rx="16" ry="4" />
        <g className="sq-shin">
          <rect className="ex-limb" x="111" y="116" width="16" height="42" rx="8" />
          <g className="sq-thigh">
            <rect className="ex-limb" x="111" y="80" width="16" height="42" rx="8" />
            <g className="sq-torso">
              <rect className="ex-torso-v" x="108" y="44" width="20" height="42" rx="10" />
              <Head cx="122" cy="32" />
              <g className="sq-bar">
                <rect className="ex-bar" x="58" y="46" width="124" height="6" rx="3" />
                <circle className="ex-plate" cx="62" cy="49" r="11" />
                <circle className="ex-plate" cx="178" cy="49" r="11" />
              </g>
              <rect className="ex-limb-thin" x="96" y="54" width="14" height="36" rx="7" />
            </g>
          </g>
        </g>
      </g>
    </g>
  )
}

export function BenchPressFigure() {
  return (
    <g className="fig fig-bench">
      <Stage />
      <rect className="ex-bench" x="40" y="108" width="156" height="11" />
      <rect className="ex-bench-leg" x="52" y="119" width="8" height="39" />
      <rect className="ex-bench-leg" x="176" y="119" width="8" height="39" />
      <Head cx="46" cy="94" />
      <rect className="ex-torso" x="56" y="92" width="108" height="16" rx="8" />
      <rect className="ex-limb" x="158" y="96" width="28" height="12" rx="6" />
      <g className="bp-arm">
        <rect className="ex-limb" x="72" y="62" width="14" height="38" rx="7" />
        <g className="bp-forearm">
          <rect className="ex-limb" x="72" y="36" width="14" height="30" rx="7" />
          <g className="bp-bar">
            <rect className="ex-bar" x="28" y="32" width="184" height="6" rx="3" />
            <circle className="ex-plate" cx="36" cy="35" r="12" />
            <circle className="ex-plate" cx="204" cy="35" r="12" />
          </g>
        </g>
      </g>
    </g>
  )
}

export function BicepsCurlFigure() {
  return (
    <g className="fig fig-curl">
      <Stage />
      <ellipse className="ex-grip" cx="108" cy="156" rx="16" ry="4" />
      <rect className="ex-limb" x="100" y="114" width="16" height="44" rx="8" />
      <rect className="ex-limb" x="101" y="76" width="16" height="44" rx="8" />
      <rect className="ex-torso-v" x="102" y="46" width="18" height="36" rx="9" />
      <Head cx="116" cy="34" />
      <rect className="ex-limb-thin" x="96" y="56" width="12" height="34" rx="6" />
      <g className="cu-arm">
        <rect className="ex-limb" x="118" y="56" width="36" height="14" rx="7" />
        <g className="cu-forearm">
          <rect className="ex-limb" x="146" y="66" width="14" height="44" rx="7" />
          <g className="cu-bell">
            <rect className="ex-bar" x="136" y="108" width="34" height="5" rx="2" />
            <circle className="ex-plate" cx="138" cy="110" r="9" />
            <circle className="ex-plate" cx="168" cy="110" r="9" />
          </g>
        </g>
      </g>
    </g>
  )
}

export function ShoulderPressFigure() {
  return (
    <g className="fig fig-press">
      <Stage />
      <ellipse className="ex-grip" cx="120" cy="156" rx="16" ry="4" />
      <rect className="ex-limb" x="112" y="114" width="16" height="44" rx="8" />
      <rect className="ex-limb" x="112" y="76" width="16" height="44" rx="8" />
      <rect className="ex-torso-v" x="110" y="46" width="20" height="36" rx="10" />
      <Head cx="120" cy="34" />
      <g className="sp-arm">
        <rect className="ex-limb" x="86" y="52" width="28" height="14" rx="7" />
        <g className="sp-forearm">
          <rect className="ex-limb" x="78" y="28" width="14" height="30" rx="7" />
        </g>
      </g>
      <g className="sp-arm-r">
        <rect className="ex-limb" x="126" y="52" width="28" height="14" rx="7" />
        <g className="sp-forearm-r">
          <rect className="ex-limb" x="148" y="28" width="14" height="30" rx="7" />
        </g>
      </g>
      <g className="sp-bar">
        <rect className="ex-bar" x="52" y="24" width="136" height="6" rx="3" />
        <circle className="ex-plate" cx="56" cy="27" r="10" />
        <circle className="ex-plate" cx="184" cy="27" r="10" />
      </g>
    </g>
  )
}

export function PullUpFigure() {
  return (
    <g className="fig fig-pullup">
      <rect className="ex-post" x="32" y="22" width="6" height="136" />
      <rect className="ex-post" x="202" y="22" width="6" height="136" />
      <rect className="ex-bar" x="32" y="22" width="176" height="7" rx="3" />
      <g className="pl-body">
        <Head cx="120" cy="62" />
        <rect className="ex-torso-v" x="110" y="72" width="20" height="44" rx="10" />
        <rect className="ex-limb" x="104" y="110" width="14" height="40" rx="7" />
        <rect className="ex-limb" x="122" y="110" width="14" height="40" rx="7" />
        <g className="pl-arm">
          <rect className="ex-limb" x="84" y="28" width="14" height="36" rx="7" />
          <g className="pl-forearm">
            <rect className="ex-limb" x="96" y="56" width="20" height="14" rx="7" />
          </g>
        </g>
        <g className="pl-arm-r">
          <rect className="ex-limb" x="142" y="28" width="14" height="36" rx="7" />
          <g className="pl-forearm-r">
            <rect className="ex-limb" x="124" y="56" width="20" height="14" rx="7" />
          </g>
        </g>
      </g>
    </g>
  )
}

export function LungeFigure() {
  return (
    <g className="fig fig-lunge">
      <Stage />
      <g className="lg-body">
        <Head cx="116" cy="32" />
        <rect className="ex-torso-v" x="106" y="42" width="18" height="42" rx="9" />
        <rect className="ex-limb-thin" x="92" y="52" width="12" height="30" rx="6" />
        <rect className="ex-limb-thin" x="124" y="52" width="12" height="30" rx="6" />
        <g className="lg-front">
          <rect className="ex-limb" x="114" y="80" width="40" height="14" rx="7" />
          <g className="lg-front-shin">
            <rect className="ex-limb" x="146" y="90" width="14" height="66" rx="7" />
            <ellipse className="ex-grip" cx="164" cy="156" rx="12" ry="3.5" />
          </g>
        </g>
        <g className="lg-back">
          <rect className="ex-limb" x="78" y="80" width="36" height="14" rx="7" />
          <g className="lg-back-shin">
            <rect className="ex-limb" x="70" y="90" width="14" height="66" rx="7" />
            <ellipse className="ex-grip" cx="68" cy="156" rx="12" ry="3.5" />
          </g>
        </g>
      </g>
    </g>
  )
}

export function PlankFigure() {
  return (
    <g className="fig fig-plank">
      <Stage />
      <g className="pk-body">
        <Head cx="42" cy="104" />
        <rect className="ex-torso" x="52" y="98" width="92" height="16" rx="8" />
        <rect className="ex-limb" x="138" y="106" width="40" height="13" rx="6" />
        <rect className="ex-limb" x="170" y="116" width="13" height="40" rx="6" />
        <ellipse className="ex-grip" cx="188" cy="156" rx="11" ry="3.5" />
        <g className="pk-arm">
          <rect className="ex-limb" x="60" y="108" width="13" height="26" rx="6" />
          <rect className="ex-limb" x="48" y="148" width="36" height="10" rx="5" />
          <ellipse className="ex-grip" cx="54" cy="156" rx="9" ry="3" />
        </g>
      </g>
    </g>
  )
}

export function LatPulldownFigure() {
  return (
    <g className="fig fig-lat">
      <Stage />
      <rect className="ex-post" x="116" y="8" width="8" height="42" />
      <rect className="ex-bench" x="78" y="118" width="84" height="10" />
      <rect className="ex-bench-leg" x="90" y="128" width="7" height="30" />
      <rect className="ex-bench-leg" x="143" y="128" width="7" height="30" />
      <g className="lt-body">
        <Head cx="120" cy="64" />
        <rect className="ex-torso-v" x="110" y="74" width="20" height="46" rx="10" />
        <rect className="ex-limb" x="96" y="116" width="14" height="40" rx="7" />
        <rect className="ex-limb" x="130" y="116" width="14" height="40" rx="7" />
        <g className="lt-arm">
          <rect className="ex-limb" x="86" y="48" width="32" height="14" rx="7" />
          <g className="lt-forearm">
            <rect className="ex-limb" x="68" y="28" width="22" height="14" rx="7" />
          </g>
        </g>
        <g className="lt-arm-r">
          <rect className="ex-limb" x="122" y="48" width="32" height="14" rx="7" />
          <g className="lt-forearm-r">
            <rect className="ex-limb" x="150" y="28" width="22" height="14" rx="7" />
          </g>
        </g>
      </g>
      <g className="lt-bar">
        <line className="ex-cable" x1="120" y1="8" x2="120" y2="30" />
        <rect className="ex-bar" x="48" y="28" width="144" height="6" rx="3" />
      </g>
    </g>
  )
}

export function DumbbellRowFigure() {
  return (
    <g className="fig fig-row">
      <Stage />
      <rect className="ex-bench" x="32" y="94" width="74" height="11" />
      <rect className="ex-bench-leg" x="42" y="105" width="8" height="53" />
      <g className="rw-body">
        <Head cx="54" cy="68" />
        <rect className="ex-torso" x="64" y="78" width="78" height="16" rx="8" transform="rotate(18 64 86)" />
        <rect className="ex-limb" x="128" y="102" width="14" height="54" rx="7" />
        <ellipse className="ex-grip" cx="148" cy="156" rx="12" ry="3.5" />
        <rect className="ex-limb-thin" x="70" y="84" width="12" height="22" rx="6" />
        <g className="rw-arm">
          <rect className="ex-limb" x="100" y="90" width="14" height="34" rx="7" />
          <g className="rw-forearm">
            <rect className="ex-limb" x="100" y="118" width="14" height="30" rx="7" />
            <g className="rw-bell">
              <rect className="ex-bar" x="90" y="146" width="34" height="5" rx="2" />
              <circle className="ex-plate" cx="92" cy="148" r="8" />
              <circle className="ex-plate" cx="122" cy="148" r="8" />
            </g>
          </g>
        </g>
      </g>
    </g>
  )
}

export function UnknownFigure() {
  return (
    <g className="fig fig-unknown">
      <Stage />
      <Head cx="120" cy="36" />
      <rect className="ex-torso-v" x="110" y="46" width="20" height="48" rx="10" />
      <rect className="ex-limb-thin" x="92" y="56" width="12" height="34" rx="6" />
      <rect className="ex-limb-thin" x="136" y="56" width="12" height="34" rx="6" />
      <rect className="ex-limb" x="100" y="90" width="14" height="66" rx="7" />
      <rect className="ex-limb" x="126" y="90" width="14" height="66" rx="7" />
      <ellipse className="ex-grip" cx="98" cy="156" rx="11" ry="3.5" />
      <ellipse className="ex-grip" cx="142" cy="156" rx="11" ry="3.5" />
      <line className="ex-unknown-mark" x1="176" y1="36" x2="208" y2="68" />
      <line className="ex-unknown-mark" x1="208" y1="36" x2="176" y2="68" />
    </g>
  )
}

const FIGURES = {
  pushup: PushUpFigure,
  squat: SquatFigure,
  benchpress: BenchPressFigure,
  bicepscurl: BicepsCurlFigure,
  shoulderpress: ShoulderPressFigure,
  pullup: PullUpFigure,
  lunge: LungeFigure,
  plank: PlankFigure,
  latpulldown: LatPulldownFigure,
  dumbbellrow: DumbbellRowFigure,
  unknown: UnknownFigure,
}

export default function ExerciseFigure({ type }) {
  const Figure = FIGURES[type] || UnknownFigure
  return <Figure />
}
