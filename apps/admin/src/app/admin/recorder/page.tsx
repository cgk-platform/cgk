/**
 * Recorder Extension Download Page
 * Screen/webcam recording Chrome extension
 */

'use client'

import { Badge, Button, cn } from '@cgk/ui'
import {
  Camera,
  Check,
  Chrome,
  Download,
  Laptop,
  MonitorPlay,
  Play,
  Settings,
  Sparkles,
  Video,
} from 'lucide-react'
import { useState } from 'react'

type TabId = 'installation' | 'guide' | 'features'

export default function RecorderPage() {
  const [activeTab, setActiveTab] = useState<TabId>('installation')

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50">
      {/* Header */}
      <header className="border-b border-rose-100/50 px-6 py-12">
        <div className="mx-auto max-w-4xl text-center">
          {/* Extension Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-violet-600 shadow-lg shadow-rose-200">
            <Video className="h-10 w-10 text-white" />
          </div>

          <Badge variant="secondary" className="mb-4 bg-rose-100 text-rose-700">
            Chrome Extension
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
            Screen Recorder
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
            Record your screen, webcam, or picture-in-picture for tutorials,
            testimonials, and product demos.
          </p>

          {/* Download Button */}
          <Button
            size="lg"
            className="mt-8 bg-gradient-to-r from-rose-500 to-violet-600 px-8 hover:from-rose-600 hover:to-violet-700"
            onClick={() => {
              // In production, this would trigger download
              alert('Extension download would start here')
            }}
          >
            <Download className="mr-2 h-5 w-5" />
            Download Extension
          </Button>

          <p className="mt-3 text-sm text-neutral-500">
            Version 1.0.0 &middot; Compatible with Chrome 120+
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-neutral-200 bg-white/50 px-6">
        <div className="mx-auto max-w-4xl">
          <nav className="flex gap-8">
            {([
              { id: 'installation', label: 'Installation', icon: Settings },
              { id: 'guide', label: 'Recording Guide', icon: Play },
              { id: 'features', label: 'Features', icon: Sparkles },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          {activeTab === 'installation' && <InstallationTab />}
          {activeTab === 'guide' && <RecordingGuideTab />}
          {activeTab === 'features' && <FeaturesTab />}
        </div>
      </main>
    </div>
  )
}

function InstallationTab() {
  const steps = [
    {
      number: 1,
      title: 'Download the Extension',
      description:
        'Click the download button above to get the extension package (.zip file).',
      icon: Download,
    },
    {
      number: 2,
      title: 'Extract the ZIP',
      description:
        'Unzip the downloaded file to a folder on your computer. Remember this location.',
      icon: Settings,
    },
    {
      number: 3,
      title: 'Open Chrome Extensions',
      description:
        'Go to chrome://extensions in your browser or Menu > More Tools > Extensions.',
      icon: Chrome,
    },
    {
      number: 4,
      title: 'Enable Developer Mode',
      description:
        'Toggle the "Developer mode" switch in the top-right corner of the extensions page.',
      icon: Settings,
    },
    {
      number: 5,
      title: 'Load the Extension',
      description:
        'Click "Load unpacked" and select the folder where you extracted the extension.',
      icon: Laptop,
    },
    {
      number: 6,
      title: 'Start Recording!',
      description:
        'The recorder icon will appear in your toolbar. Click it to start recording.',
      icon: Video,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Installation Guide</h2>
        <p className="mt-2 text-neutral-600">
          Follow these steps to install the recorder extension in Chrome.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.number}
            className="relative rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-600 font-bold text-white shadow">
              {step.number}
            </div>
            <div className="mb-3 rounded-lg bg-neutral-50 p-2 w-fit">
              <step.icon className="h-5 w-5 text-neutral-600" />
            </div>
            <h3 className="font-semibold text-neutral-900">{step.title}</h3>
            <p className="mt-1 text-sm text-neutral-600">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="font-semibold text-amber-900">Troubleshooting</h3>
        <ul className="mt-2 space-y-1 text-sm text-amber-800">
          <li>&bull; Make sure Developer Mode is enabled</li>
          <li>&bull; Try refreshing the extensions page after loading</li>
          <li>&bull; Check that you selected the correct folder (contains manifest.json)</li>
          <li>&bull; Restart Chrome if the extension doesn&apos;t appear</li>
        </ul>
      </div>
    </div>
  )
}

function RecordingGuideTab() {
  const modes = [
    {
      title: 'Screen Recording',
      description: 'Record your entire screen or a specific window/tab.',
      icon: MonitorPlay,
      color: 'from-blue-500 to-cyan-500',
      steps: [
        'Click the recorder icon',
        'Select "Screen" mode',
        'Choose what to share (screen, window, or tab)',
        'Click Start Recording',
        'Click Stop when finished',
      ],
    },
    {
      title: 'Webcam Recording',
      description: 'Record yourself using your webcam.',
      icon: Camera,
      color: 'from-rose-500 to-pink-500',
      steps: [
        'Click the recorder icon',
        'Select "Webcam" mode',
        'Allow camera access if prompted',
        'Position yourself in frame',
        'Click Start Recording',
      ],
    },
    {
      title: 'Picture-in-Picture',
      description: 'Record screen with webcam overlay.',
      icon: Video,
      color: 'from-violet-500 to-purple-500',
      steps: [
        'Click the recorder icon',
        'Select "PiP" mode',
        'Choose screen and webcam position',
        'Adjust overlay size if needed',
        'Click Start Recording',
      ],
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Recording Guide</h2>
        <p className="mt-2 text-neutral-600">
          Learn how to use each recording mode effectively.
        </p>
      </div>

      <div className="space-y-6">
        {modes.map((mode) => (
          <div
            key={mode.title}
            className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
          >
            <div className={cn('bg-gradient-to-r p-6', mode.color)}>
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-white/20 p-3">
                  <mode.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{mode.title}</h3>
                  <p className="text-white/80">{mode.description}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-neutral-500">
                How to Use
              </h4>
              <ol className="space-y-2">
                {mode.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                      {i + 1}
                    </span>
                    <span className="text-neutral-700">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeaturesTab() {
  const features = [
    {
      title: 'Multiple Recording Modes',
      description: 'Screen, webcam, or picture-in-picture - choose what works best.',
      available: true,
    },
    {
      title: 'High Quality Video',
      description: 'Record in up to 1080p for crisp, professional-looking videos.',
      available: true,
    },
    {
      title: 'Audio Recording',
      description: 'Capture system audio and microphone simultaneously.',
      available: true,
    },
    {
      title: 'Instant Download',
      description: 'Recordings save directly to your computer as WebM files.',
      available: true,
    },
    {
      title: 'Countdown Timer',
      description: 'Get ready with a 3-second countdown before recording starts.',
      available: true,
    },
    {
      title: 'Recording Controls',
      description: 'Pause, resume, and stop recordings with easy controls.',
      available: true,
    },
    {
      title: 'Drawing Tools',
      description: 'Annotate your screen while recording (coming soon).',
      available: false,
    },
    {
      title: 'Cloud Upload',
      description: 'Automatic upload to your media library (coming soon).',
      available: false,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Features</h2>
        <p className="mt-2 text-neutral-600">
          Everything you need for professional screen recordings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className={cn(
              'rounded-xl border p-5',
              feature.available
                ? 'border-neutral-200 bg-white'
                : 'border-dashed border-neutral-300 bg-neutral-50'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 rounded-full p-1',
                  feature.available
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-neutral-200 text-neutral-400'
                )}
              >
                <Check className="h-4 w-4" />
              </div>
              <div>
                <h3
                  className={cn(
                    'font-medium',
                    feature.available ? 'text-neutral-900' : 'text-neutral-500'
                  )}
                >
                  {feature.title}
                  {!feature.available && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </h3>
                <p className="mt-1 text-sm text-neutral-600">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Roadmap */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-6">
        <h3 className="font-semibold text-violet-900">Roadmap</h3>
        <p className="mt-2 text-sm text-violet-800">
          We&apos;re actively working on new features including drawing/annotation
          tools, direct cloud upload, video trimming, and integration with your
          content management system. Stay tuned!
        </p>
      </div>
    </div>
  )
}
