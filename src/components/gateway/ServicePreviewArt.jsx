import { motion } from 'framer-motion';

function SmartApplyArt() {
  return (
    <svg
      viewBox="0 0 620 360"
      role="img"
      aria-label="پیش‌نمایش فضای کاری Smart Apply"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="smart-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10294E" />
          <stop offset="1" stopColor="#071A3D" />
        </linearGradient>
        <radialGradient id="smart-orb" cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#F8E8B7" />
          <stop offset=".35" stopColor="#C6A768" />
          <stop offset=".72" stopColor="#1DBA91" />
          <stop offset="1" stopColor="#0C3C43" />
        </radialGradient>
        <filter id="smart-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <rect x="25" y="20" width="570" height="320" rx="28" fill="url(#smart-panel)" />
      <rect x="38" y="34" width="544" height="292" rx="21" fill="#F8F4EC" fillOpacity=".98" />
      <rect x="38" y="34" width="544" height="43" rx="21" fill="#FFFFFF" />
      <circle cx="60" cy="55" r="5" fill="#1DBA91" />
      <circle cx="77" cy="55" r="5" fill="#C6A768" fillOpacity=".7" />
      <rect x="98" y="49" width="84" height="11" rx="5.5" fill="#071A3D" fillOpacity=".12" />
      <rect x="492" y="47" width="68" height="15" rx="7.5" fill="#071A3D" fillOpacity=".06" />

      <rect x="54" y="92" width="146" height="216" rx="18" fill="#071A3D" />
      <circle cx="127" cy="141" r="37" fill="#1DBA91" fillOpacity=".16" filter="url(#smart-glow)" />
      <circle cx="127" cy="141" r="30" fill="none" stroke="#C6A768" strokeOpacity=".35" />
      <circle cx="127" cy="141" r="20" fill="url(#smart-orb)" />
      <path d="M114 142c6-10 20-10 26 0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
      <circle cx="119" cy="135" r="1.8" fill="#fff" />
      <circle cx="135" cy="135" r="1.8" fill="#fff" />
      <rect x="77" y="187" width="100" height="9" rx="4.5" fill="#fff" fillOpacity=".18" />
      <rect x="91" y="204" width="72" height="7" rx="3.5" fill="#fff" fillOpacity=".09" />
      <rect x="70" y="235" width="114" height="34" rx="12" fill="#1DBA91" fillOpacity=".15" stroke="#1DBA91" strokeOpacity=".24" />
      <circle cx="89" cy="252" r="5" fill="#1DBA91" />
      <rect x="101" y="247" width="61" height="6" rx="3" fill="#fff" fillOpacity=".46" />
      <rect x="70" y="280" width="71" height="8" rx="4" fill="#C6A768" fillOpacity=".52" />

      <rect x="218" y="94" width="342" height="46" rx="15" fill="#FFFFFF" stroke="#071A3D" strokeOpacity=".06" />
      <circle cx="536" cy="117" r="10" fill="#071A3D" />
      <rect x="260" y="106" width="256" height="8" rx="4" fill="#071A3D" fillOpacity=".12" />
      <rect x="328" y="121" width="188" height="6" rx="3" fill="#071A3D" fillOpacity=".055" />

      <rect x="294" y="155" width="266" height="68" rx="19" fill="#FFFFFF" stroke="#071A3D" strokeOpacity=".06" />
      <rect x="316" y="171" width="213" height="8" rx="4" fill="#071A3D" fillOpacity=".15" />
      <rect x="348" y="188" width="181" height="6" rx="3" fill="#071A3D" fillOpacity=".07" />
      <rect x="451" y="203" width="78" height="5" rx="2.5" fill="#C6A768" fillOpacity=".6" />

      <rect x="218" y="237" width="240" height="45" rx="16" fill="#DDF4EB" />
      <circle cx="434" cy="259.5" r="9" fill="#17866C" />
      <path d="m430 259 3 3 6-7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="245" y="251" width="169" height="7" rx="3.5" fill="#0B624F" fillOpacity=".25" />
      <rect x="304" y="265" width="110" height="5" rx="2.5" fill="#0B624F" fillOpacity=".12" />

      <rect x="218" y="295" width="342" height="13" rx="6.5" fill="#071A3D" fillOpacity=".06" />
      <rect x="218" y="295" width="216" height="13" rx="6.5" fill="#1DBA91" />
      <circle cx="434" cy="301.5" r="5" fill="#F8F4EC" stroke="#1DBA91" strokeWidth="3" />
    </svg>
  );
}

function TransferArt() {
  return (
    <svg
      viewBox="0 0 620 360"
      role="img"
      aria-label="پیش‌نمایش فضای کاری AI Transfer"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="transfer-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#101B4F" />
          <stop offset=".5" stopColor="#31236B" />
          <stop offset="1" stopColor="#071A3D" />
        </linearGradient>
        <linearGradient id="transfer-route" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#806BFF" />
          <stop offset=".5" stopColor="#C6A768" />
          <stop offset="1" stopColor="#39C9AB" />
        </linearGradient>
        <filter id="transfer-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <rect x="25" y="20" width="570" height="320" rx="28" fill="url(#transfer-panel)" />
      <circle cx="510" cy="60" r="80" fill="#806BFF" fillOpacity=".12" filter="url(#transfer-glow)" />
      <circle cx="104" cy="308" r="90" fill="#C6A768" fillOpacity=".11" filter="url(#transfer-glow)" />
      <path d="M86 266C164 238 173 130 268 136s105 117 196 75c45-21 59-69 80-117" fill="none" stroke="url(#transfer-route)" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 10" />

      <rect x="52" y="47" width="516" height="48" rx="16" fill="#FFFFFF" fillOpacity=".07" stroke="#FFFFFF" strokeOpacity=".1" />
      <rect x="76" y="64" width="126" height="11" rx="5.5" fill="#FFFFFF" fillOpacity=".62" />
      <rect x="448" y="61" width="94" height="18" rx="9" fill="#806BFF" fillOpacity=".25" stroke="#A99CFF" strokeOpacity=".35" />

      <g>
        <circle cx="95" cy="266" r="33" fill="#101B4F" stroke="#C6A768" strokeOpacity=".65" strokeWidth="2" />
        <circle cx="95" cy="266" r="23" fill="#C6A768" fillOpacity=".14" />
        <path d="M78 260h34M82 260v19h26v-19M76 258l19-11 19 11" fill="none" stroke="#E2CC9B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="57" y="309" width="76" height="8" rx="4" fill="#FFFFFF" fillOpacity=".17" />
      </g>

      <g>
        <circle cx="268" cy="136" r="40" fill="#171E54" stroke="#806BFF" strokeOpacity=".8" strokeWidth="2" />
        <circle cx="268" cy="136" r="29" fill="#806BFF" fillOpacity=".13" />
        <rect x="252" y="118" width="32" height="38" rx="4" fill="none" stroke="#B7AEFF" strokeWidth="2.1" />
        <path d="M259 128h18M259 136h18M259 144h12" stroke="#B7AEFF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="268" cy="136" r="51" fill="none" stroke="#806BFF" strokeOpacity=".12" />
        <rect x="226" y="191" width="84" height="8" rx="4" fill="#FFFFFF" fillOpacity=".17" />
      </g>

      <g>
        <circle cx="468" cy="210" r="36" fill="#102A45" stroke="#39C9AB" strokeOpacity=".7" strokeWidth="2" />
        <circle cx="468" cy="210" r="25" fill="#39C9AB" fillOpacity=".12" />
        <path d="M451 204h34M455 204v20h26v-20M449 202l19-11 19 11" fill="none" stroke="#75E1C9" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="429" y="260" width="78" height="8" rx="4" fill="#FFFFFF" fillOpacity=".17" />
      </g>

      <circle cx="170" cy="214" r="5" fill="#C6A768" />
      <circle cx="368" cy="199" r="5" fill="#9E91FF" />
      <circle cx="529" cy="135" r="5" fill="#39C9AB" />

      <rect x="174" y="280" width="300" height="36" rx="18" fill="#FFFFFF" fillOpacity=".07" stroke="#FFFFFF" strokeOpacity=".1" />
      <rect x="197" y="294" width="205" height="8" rx="4" fill="#FFFFFF" fillOpacity=".28" />
      <circle cx="446" cy="298" r="9" fill="#C6A768" />
      <path d="m442 298 3 3 6-7" fill="none" stroke="#071A3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ServicePreviewArt({ service }) {
  return (
    <motion.div
      className="gateway-preview-art"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: service === 'smart' ? 0.15 : 0.25 }}
    >
      {service === 'smart' ? <SmartApplyArt /> : <TransferArt />}
    </motion.div>
  );
}
