import type { NodeType } from '@/types/diagram'

interface SidebarProps {
    onAddNode: (type: NodeType, labelOverride?: string) => void
    onAddText: () => void
    onAddGroup: () => void
}

type SidebarItemDef = {
    icon: React.ReactNode
    label: string
    action?: () => void
}

type SidebarSection = {
    title: string
    items: SidebarItemDef[]
}

function buildSections(onAddNode: SidebarProps['onAddNode'], onAddText: SidebarProps['onAddText'], onAddGroup: SidebarProps['onAddGroup']): SidebarSection[] {
    return [
        {
            title: 'Basic Shapes',
            items: [
                { icon: <RectIcon />, label: 'Rectangle', action: () => onAddNode('rectangle') },
                { icon: <CircleIcon />, label: 'Circle', action: () => onAddNode('circle') },
                { icon: <DiamondIcon />, label: 'Diamond', action: () => onAddNode('diamond') },
            ],
        },
        {
            title: 'System Components',
            items: [
                { icon: <ServiceIcon />, label: 'Service', action: () => onAddNode('rounded-rectangle', 'Service') },
                { icon: <DatabaseIcon />, label: 'Database', action: () => onAddNode('database') },
                { icon: <QueueIcon />, label: 'Queue', action: () => onAddNode('queue') },
                { icon: <CacheIcon />, label: 'Cache', action: () => onAddNode('cache') },
                { icon: <ClientIcon />, label: 'Client', action: () => onAddNode('client') },
                { icon: <GatewayIcon />, label: 'API Gateway', action: () => onAddNode('rectangle', 'API Gateway') },
            ],
        },
        {
            title: 'Groups',
            items: [
                { icon: <GroupIcon />, label: 'Group', action: onAddGroup },
            ],
        },
        {
            title: 'Text',
            items: [
                { icon: <TextIcon />, label: 'Text block', action: onAddText },
                { icon: <LabelIcon />, label: 'Label', action: onAddText },
            ],
        },
    ]
}

export default function Sidebar({ onAddNode, onAddText, onAddGroup }: SidebarProps) {
    const sections = buildSections(onAddNode, onAddText, onAddGroup)
    return (
        <aside className="w-52 flex flex-col bg-zinc-950 border-r border-zinc-800 overflow-y-auto shrink-0 select-none">
            <div className="flex flex-col gap-5 py-4">
                {sections.map((section) => (
                    <div key={section.title}>
                        <p className="px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                            {section.title}
                        </p>
                        <div className="flex flex-col">
                            {section.items.map((item) => (
                                <SidebarItem
                                    key={item.label}
                                    icon={item.icon}
                                    label={item.label}
                                    action={item.action}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    )
}

function SidebarItem({ icon, label, action }: SidebarItemDef) {
    const active = !!action
    return (
        <button
            onClick={action}
            disabled={!active}
            className={
                `flex items-center gap-2.5 px-4 py-2 text-left text-[13px] transition-colors duration-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:ring-inset ${active
                    ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 cursor-pointer'
                    : 'text-zinc-600 opacity-40 cursor-default'
                }`
            }
        >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {icon}
            </span>
            <span>{label}</span>
        </button>
    )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function RectIcon() {
    return (
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <rect x="0.5" y="0.5" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    )
}

function CircleIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5.4" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    )
}

function DiamondIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L11 6L6 11L1 6L6 1Z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    )
}

function ServiceIcon() {
    return (
        <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
            <rect x="0.5" y="0.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M0.5 3.5H13.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    )
}

function DatabaseIcon() {
    return (
        <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
            <ellipse cx="6" cy="3" rx="5.4" ry="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M0.6 3v7" stroke="currentColor" strokeWidth="1.2" />
            <path d="M11.4 3v7" stroke="currentColor" strokeWidth="1.2" />
            <ellipse cx="6" cy="10" rx="5.4" ry="2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    )
}

function QueueIcon() {
    return (
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <rect x="0.5" y="0.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5 2.5V7.5M9 2.5V7.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    )
}

function CacheIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="0.5" y="0.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3 6.5H10M6.5 3v7" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    )
}

function ClientIcon() {
    return (
        <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
            <rect x="0.5" y="0.5" width="12" height="8.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 11.5H9M6.5 9v2.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    )
}

function GatewayIcon() {
    return (
        <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
            <path d="M0.5 6H3.5M10.5 6H13.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3.5 1.5h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    )
}

function TextIcon() {
    return (
        <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
            <path d="M2 2.5h10M7 2.5v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
    )
}

function LabelIcon() {
    return (
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M1 5h12M1 2h7M1 8h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    )
}

function GroupIcon() {
    return (
        <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
            <rect x="0.5" y="0.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
        </svg>
    )
}
