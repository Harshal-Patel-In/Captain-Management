"use client";

import { useEffect, useState, useRef } from "react";

export function Cursor() {
    const cursorRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isClicking, setIsClicking] = useState(false);

    useEffect(() => {
        let mouseX = 0;
        let mouseY = 0;
        let cursorX = 0;
        let cursorY = 0;
        let animationFrameId: number;

        const moveCursor = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        // Smooth lerp animation
        const animate = () => {
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;

            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName.toLowerCase() === "button" ||
                target.tagName.toLowerCase() === "a" ||
                target.tagName.toLowerCase() === "input" ||
                target.closest("button") ||
                target.closest("a") ||
                target.classList.contains("cursor-pointer") ||
                target.style.cursor === "pointer"
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        const handleMouseDown = () => {
            setIsClicking(true);
        };

        const handleMouseUp = () => {
            setIsClicking(false);
        };

        window.addEventListener("mousemove", moveCursor);
        window.addEventListener("mouseover", handleMouseOver);
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        animationFrameId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("mousemove", moveCursor);
            window.removeEventListener("mouseover", handleMouseOver);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <>
            <style jsx global>{`
                @media (hover: hover) and (pointer: fine) {
                    body,
                    body * {
                        cursor: none !important;
                    }
                }
            `}</style>

            {/* Custom Arrow Cursor - Minimal & Professional */}
            <div
                ref={cursorRef}
                className="fixed top-0 left-0 pointer-events-none z-[10000] hidden md:block"
                style={{
                    width: '24px',
                    height: '24px',
                    marginLeft: '2px',
                    marginTop: '2px',
                }}
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="transition-all duration-150 ease-out"
                    style={{
                        transform: isClicking
                            ? 'scale(0.92)'
                            : isHovering
                                ? 'scale(1.08)'
                                : 'scale(1)',
                        opacity: isClicking ? 0.85 : 1,
                        filter: 'drop-shadow(0 1px 3px rgba(11, 29, 21, 0.15))',
                    }}
                >
                    {/* Outer stroke - always cream */}
                    <path
                        d="M3.5 3.5L20.5 11.5L12 13.5L9.5 21.5L3.5 3.5Z"
                        stroke="#f4f1ea"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    {/* Inner fill - always deep green */}
                    <path
                        d="M4 4L19 11L11.5 12.8L9.2 20L4 4Z"
                        fill="#0b1d15"
                    />
                </svg>
            </div>
        </>
    );
}
