
export function Grain() {
    return (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[50] opacity-[0.05] mix-blend-multiply">
            <svg className="w-full h-full">
                <filter id="noiseFilter">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.85"
                        numOctaves="3"
                        stitchTiles="stitch"
                    />
                </filter>
                <rect width="100%" height="100%" filter="url(#noiseFilter)" />
            </svg>
        </div>
    );
}
