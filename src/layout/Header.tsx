export default function Header({
    diagramName,
    onNew,
    onSave,
    onLoad,
    onExportSvg,
    onExportSvgTransparent,
    onExportJson,
    onImportJson,
}: {
    diagramName: string
    onNew: () => void
    onSave: () => void
    onLoad: () => void
    onExportSvg: () => void
    onExportSvgTransparent: () => void
    onExportJson: () => void
    onImportJson: () => void
}) {
    return (
        <header className="flex items-center justify-between px-4 h-12 border-b border-zinc-800 bg-zinc-950 shrink-0 select-none">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded bg-indigo-500 flex items-center justify-center">
                    <svg
                        width="11"
                        height="11"
                        viewBox="0 0 11 11"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <rect x="1" y="1" width="3.5" height="3.5" rx="0.5" fill="white" />
                        <rect x="6.5" y="1" width="3.5" height="3.5" rx="0.5" fill="white" opacity="0.6" />
                        <rect x="1" y="6.5" width="3.5" height="3.5" rx="0.5" fill="white" opacity="0.6" />
                        <rect x="6.5" y="6.5" width="3.5" height="3.5" rx="0.5" fill="white" opacity="0.4" />
                    </svg>
                </div>
                <span className="text-[13px] font-semibold tracking-tight text-zinc-100">
                    DotJungle
                </span>
                <span className="text-[10px] font-medium text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded tracking-wide uppercase">
                    Beta
                </span>
            </div>

            {/* Diagram title — placeholder */}
            <div className="flex items-center gap-1 text-zinc-500 text-[13px] cursor-default">
                <span className="text-zinc-400 font-medium">{diagramName}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
                <HeaderButton label="New" onClick={onNew} />
                <HeaderButton label="Import" onClick={onImportJson} />
                <div className="w-px h-4 bg-zinc-700 mx-0.5" />
                <HeaderButton label="Export SVG" onClick={onExportSvg} />
                <HeaderButton label="Export SVG (transparent)" onClick={onExportSvgTransparent} />
                <HeaderButton label="Export JSON" onClick={onExportJson} />
                <div className="w-px h-4 bg-zinc-700 mx-0.5" />
                <HeaderButton label="Load" onClick={onLoad} />
                <HeaderButton label="Save" variant="primary" onClick={onSave} />
            </div>
        </header>
    )
}

function HeaderButton({
    label,
    variant = 'default',
    onClick,
}: {
    label: string
    variant?: 'default' | 'primary'
    onClick?: () => void
}) {
    return (
        <button
            className={[
                'px-3 py-1.5 rounded text-[12px] font-medium transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                variant === 'primary'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
            ].join(' ')}
            onClick={onClick}
        >
            {label}
        </button>
    )
}
