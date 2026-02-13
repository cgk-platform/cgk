'use client'

import { cn } from '@cgk-platform/ui'
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Mic,
  Monitor,
  Sun,
  Volume2,
} from 'lucide-react'
import { useState } from 'react'

interface RecordingTipsProps {
  className?: string
  defaultExpanded?: boolean
}

/**
 * Recording tips and guidelines for creators
 *
 * Collapsible sections with best practices for video recording
 */
export function RecordingTips({ className, defaultExpanded = false }: RecordingTipsProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    defaultExpanded ? ['lighting', 'audio', 'framing', 'environment'] : []
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    )
  }

  const sections = [
    {
      id: 'lighting',
      icon: Sun,
      title: 'Lighting',
      tips: [
        'Position yourself facing a window for natural light',
        'Avoid backlighting (light behind you) which creates silhouettes',
        'Use a ring light or desk lamp at eye level for even illumination',
        'Soft, diffused light is more flattering than harsh direct light',
        'Check for shadows on your face - fill light can help eliminate them',
      ],
    },
    {
      id: 'audio',
      icon: Mic,
      title: 'Audio Quality',
      tips: [
        'Use a dedicated microphone when possible (USB mics work great)',
        'Position the mic 6-12 inches from your mouth',
        'Record in a quiet room with minimal echo',
        'Close windows and turn off fans/AC if possible',
        'Do a test recording to check audio levels before your main take',
        'Aim for -12dB to -6dB on your audio meter',
      ],
    },
    {
      id: 'framing',
      icon: Camera,
      title: 'Camera Framing',
      tips: [
        'Position camera at eye level or slightly above',
        'Follow the rule of thirds - position your eyes on the upper third line',
        'Leave some headroom but not too much empty space above',
        'For talking head videos, frame from chest up',
        'Look directly at the camera lens, not the screen',
        'Keep a consistent distance from the camera',
      ],
    },
    {
      id: 'environment',
      icon: Monitor,
      title: 'Background & Environment',
      tips: [
        'Choose a clean, uncluttered background',
        'Blur your background if your space is messy',
        'Ensure nothing distracting is visible behind you',
        'Consider adding simple decor that reflects your brand',
        'Avoid busy patterns that can cause visual noise',
        'Check for any reflective surfaces that might cause glare',
      ],
    },
  ]

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 pb-2">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold">Recording Tips</h3>
      </div>

      {sections.map((section) => {
        const isExpanded = expandedSections.includes(section.id)
        const Icon = section.icon

        return (
          <div
            key={section.id}
            className="overflow-hidden rounded-lg border bg-card"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{section.title}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t bg-muted/30 px-4 py-3">
                <ul className="space-y-2">
                  {section.tips.map((tip, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}

      {/* Quick checklist */}
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <h4 className="mb-3 font-medium text-amber-500">Quick Checklist</h4>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            'Camera at eye level',
            'Good lighting on face',
            'Audio test complete',
            'Background is tidy',
            'Script ready',
            'Water nearby',
            'Phone on silent',
            'Notifications off',
          ].map((item) => (
            <label key={item} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-amber-500/50 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-muted-foreground">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact version for embedding in recording interface
 */
export function RecordingTipsCompact({ className }: { className?: string }) {
  const quickTips = [
    { icon: Sun, tip: 'Face a light source' },
    { icon: Mic, tip: 'Check audio levels' },
    { icon: Camera, tip: 'Camera at eye level' },
    { icon: Volume2, tip: 'Quiet environment' },
  ]

  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      {quickTips.map(({ icon: Icon, tip }) => (
        <div
          key={tip}
          className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm"
        >
          <Icon className="h-4 w-4 text-amber-500" />
          <span className="text-muted-foreground">{tip}</span>
        </div>
      ))}
    </div>
  )
}
