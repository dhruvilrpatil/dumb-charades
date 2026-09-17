import React from 'react'

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-[#ebebeb] bg-[#fafafa] pt-12 pb-10 mt-auto select-none">
      {/* 2D Sketch Graphic Behind (Architectural Line-art Sketch of Bombay / Gateway of India & Taj) */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.15] text-[#171717]"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 700 160"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full max-w-2xl h-full object-contain"
        >
          {/* Ground & Promenade Sea Wall */}
          <line x1="20" y1="140" x2="680" y2="140" />
          <line x1="40" y1="145" x2="660" y2="145" strokeDasharray="6 4" strokeWidth="0.8" />
          <path d="M80 152 Q120 150 160 152 T240 152 T320 152 T400 152 T480 152 T560 152 T640 152" strokeWidth="0.8" opacity="0.6" />

          {/* Left Skyline: Iconic Taj Mahal Palace Hotel Outline */}
          <path d="M60 140 V105 H95 V90 H105 V80 H115 V90 H125 V105 H155 V140" />
          {/* Taj Central Grand Dome */}
          <path d="M100 80 C100 62 110 52 110 42 C110 52 120 62 120 80" />
          <line x1="110" y1="42" x2="110" y2="35" />
          {/* Taj Side Domes */}
          <path d="M72 105 C72 95 78 88 78 82 C78 88 84 95 84 105" strokeWidth="0.9" />
          <path d="M136 105 C136 95 142 88 142 82 C142 88 148 95 148 105" strokeWidth="0.9" />
          {/* Taj Fenestration / Arches */}
          <path d="M68 120 H86 M68 130 H86 M130 120 H150 M130 130 H150" strokeWidth="0.8" strokeDasharray="2 2" />
          <path d="M98 115 H122 M98 126 H122" strokeWidth="0.8" />

          {/* Center: Iconic Gateway of India */}
          {/* Main Structure Box & Plinth */}
          <path d="M260 140 V72 H440 V140" />
          <line x1="250" y1="140" x2="450" y2="140" strokeWidth="1.6" />
          <line x1="255" y1="136" x2="445" y2="136" strokeWidth="1" />

          {/* Stepped Cornice / Parapet & Upper Balcony */}
          <line x1="256" y1="72" x2="444" y2="72" strokeWidth="1.8" />
          <line x1="252" y1="67" x2="448" y2="67" strokeWidth="1.4" />
          <line x1="256" y1="62" x2="444" y2="62" strokeWidth="1" />
          {/* Architectural Jali / Frieze across top */}
          <path d="M265 67 V62 M280 67 V62 M295 67 V62 M310 67 V62 M325 67 V62 M340 67 V62 M355 67 V62 M370 67 V62 M385 67 V62 M400 67 V62 M415 67 V62 M430 67 V62" strokeWidth="0.8" />

          {/* Central Grand Saracenic Archway */}
          <path d="M312 140 V98 C312 80 330 68 350 68 C370 68 388 80 388 98 V140" strokeWidth="1.5" />
          {/* Inner Arch Contour */}
          <path d="M320 140 V102 C320 86 333 76 350 76 C367 76 380 86 380 102 V140" strokeWidth="0.9" />
          {/* Arch Keystones / Radiating Lines */}
          <line x1="350" y1="68" x2="350" y2="63" strokeWidth="1.2" />
          <line x1="336" y1="72" x2="332" y2="67" strokeWidth="1" />
          <line x1="364" y1="72" x2="368" y2="67" strokeWidth="1" />

          {/* Flanking Side Arches */}
          <path d="M272 140 V106 C272 96 280 90 290 90 C300 90 308 96 308 106 V140" strokeWidth="1.1" />
          <path d="M392 140 V106 C392 96 400 90 410 90 C420 90 428 96 428 106 V140" strokeWidth="1.1" />

          {/* Left Turrets / Minarets */}
          <path d="M256 62 V42 H266 V62" />
          <path d="M253 42 C253 34 261 28 261 22 C261 28 269 34 269 42 Z" strokeWidth="1" />
          <line x1="261" y1="22" x2="261" y2="16" />

          {/* Right Turrets / Minarets */}
          <path d="M434 62 V42 H444 V62" />
          <path d="M431 42 C431 34 439 28 439 22 C439 28 447 34 447 42 Z" strokeWidth="1" />
          <line x1="439" y1="22" x2="439" y2="16" />

          {/* Inner Turret Domes */}
          <path d="M307 62 V48 H315 V62" strokeWidth="0.9" />
          <path d="M305 48 C305 42 311 37 311 33 C311 37 317 42 317 48 Z" strokeWidth="0.9" />
          <path d="M385 62 V48 H393 V62" strokeWidth="0.9" />
          <path d="M383 48 C383 42 389 37 389 33 C389 37 395 42 395 48 Z" strokeWidth="0.9" />

          {/* Right Skyline: Marine Drive Art Deco Outline & Streetlights */}
          <path d="M510 140 V115 H540 V125 H575 V110 H605 V140" strokeWidth="1" />
          <path d="M520 115 V102 C520 98 528 98 528 102 V115" strokeWidth="0.8" />
          {/* Queen's Necklace Street Light Post */}
          <path d="M485 140 V110 C485 104 494 104 494 108" strokeWidth="1" />
          <circle cx="494" cy="109" r="1.5" />
          <path d="M635 140 V118 C635 112 644 112 644 116" strokeWidth="1" />
          <circle cx="644" cy="117" r="1.5" />

          {/* Sea Birds / Coastal Breeze Gulls Sketch */}
          <path d="M200 36 Q206 28 212 36 Q218 28 224 36" strokeWidth="0.9" />
          <path d="M228 44 Q232 38 236 44 Q240 38 244 44" strokeWidth="0.8" />
          <path d="M470 40 Q475 33 480 40 Q485 33 490 40" strokeWidth="0.9" />

          {/* Sketchy drafting construction lines */}
          <line x1="180" y1="72" x2="520" y2="72" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.4" />
          <line x1="350" y1="12" x2="350" y2="148" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.4" />
        </svg>
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        <div className="flex flex-col items-center bg-[#fafafa]/85 backdrop-blur-[2px] px-5 py-2 rounded-full border border-[#ebebeb]/60 shadow-[0px_1px_2px_rgba(0,0,0,0.02)]">
          <p className="text-[14px] font-semibold tracking-[-0.2px] text-[#171717]">
            Made In Bombay
          </p>
          <a
            href="https://x.com/dhruvilrpatil"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 font-mono text-[12px] text-[#8f8f8f] hover:text-[#171717] transition-colors"
          >
            @dhruvilrpatil
          </a>
        </div>
      </div>
    </footer>
  )
}
