"use client";

import Image from "next/image";
import { type CSSProperties, useState } from "react";

const defaultTransform = "perspective(1400px) rotateX(0deg) rotateY(0deg) translateY(0)";

export function HeroBook() {
  const [transform, setTransform] = useState(defaultTransform);

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 10;
    const rotateX = (0.5 - y) * 8;

    setTransform(
      `perspective(1400px) rotateX(${(rotateX * 0.55).toFixed(2)}deg) rotateY(${(rotateY * 0.55).toFixed(2)}deg) translateY(-2px)`
    );
  }

  function handleLeave() {
    setTransform(defaultTransform);
  }

  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <div className="absolute inset-x-[10%] top-[12%] h-[62%] rounded-[48px] bg-[radial-gradient(circle_at_center,rgba(203,232,140,0.44),rgba(173,213,116,0.18)_54%,transparent_78%)] blur-3xl" />
      <div
        className="relative h-[620px] cursor-default select-none"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <div
          className="absolute inset-x-[8%] top-[6%] h-[520px] origin-center transition-transform duration-200 ease-out"
          style={{ transform } as CSSProperties}
        >
          <div className="absolute inset-[2.6%_2.2%_0.6%_1.8%] rounded-[18px] bg-[linear-gradient(180deg,#f0e1b9_0%,#dcc186_55%,#bc9656_100%)] shadow-[0_18px_26px_rgba(17,17,17,0.14)]" />
          <div className="absolute inset-[6px_2.2%_0.6%_1.8%] rounded-[18px] bg-[repeating-linear-gradient(90deg,#f4e8c8_0_7px,#d7b873_7px_8px,#efdfb6_8px_15px)] opacity-85 [clip-path:polygon(4%_95%,96%_95%,96%_100%,4%_100%)]" />
          <div className="absolute inset-[2.6%_2.2%_0.6%_1.8%] rounded-[18px] bg-[repeating-linear-gradient(180deg,#f6e8c4_0_8px,#d3b26a_8px_9px,#efdfb7_9px_16px)] opacity-90 [clip-path:polygon(96%_3%,100%_3%,100%_95%,96%_95%)]" />
          <div className="absolute inset-y-[1.5%] left-[0.6%] w-[2.2%] rounded-l-[14px] bg-[linear-gradient(180deg,#8d622e_0%,#603d17_100%)]" />
          <div className="absolute inset-[0_4.2%_4.3%_0] overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#e2b85d_0%,#cf9d42_100%)] shadow-[0_22px_28px_rgba(17,17,17,0.18)]">
            <div className="absolute inset-y-0 left-0 w-[3.8%] bg-[linear-gradient(180deg,#99672b_0%,#673f16_100%)]" />
            <div className="absolute inset-y-0 left-[3.8%] w-[1.1%] bg-[#573511]" />
            <div className="absolute inset-[1.8%_2%_2%_5.2%] overflow-hidden rounded-[16px] bg-[#d7c18d]">
              <Image
                src="/Image_2026-03-14_185549_786.jpg"
                alt="Well Endowed cover artwork"
                fill
                priority
                className="object-cover object-center"
              />
              <div className="absolute inset-0 ring-1 ring-black/8" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[1.2%] bg-black/10" />
            <div className="absolute inset-y-0 right-0 w-[1.4%] bg-black/10" />
          </div>
        </div>
        <div className="absolute inset-x-[14%] bottom-[7%] h-14 rounded-full bg-black/15 blur-2xl" />
      </div>
    </div>
  );
}
