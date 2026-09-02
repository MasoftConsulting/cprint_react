'use client'

import { useState } from 'react'

export type FaqItem = {
  question: string
  answer: string
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="mt-8 space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div key={item.question} className="surface-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold"
            >
              {item.question}
              <span className="text-lg text-primary" aria-hidden>
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && <div className="px-5 pb-4 text-sm text-muted-foreground">{item.answer}</div>}
          </div>
        )
      })}
    </div>
  )
}
