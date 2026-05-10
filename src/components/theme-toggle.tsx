"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const isDark = resolvedTheme === "dark"
    const newTheme = isDark ? "light" : "dark"

    if (!document.startViewTransition) {
      setTheme(newTheme)
      return
    }

    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    )

    const transition = document.startViewTransition(() => {
      // Manually toggle class to ensure the new snapshot is taken with the correct theme
      // since next-themes might apply the class asynchronously.
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      
      flushSync(() => {
        setTheme(newTheme)
      })
    })

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ]
      
      document.documentElement.animate(
        {
          clipPath: isDark ? [...clipPath].reverse() : clipPath,
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: isDark
            ? "::view-transition-old(root)"
            : "::view-transition-new(root)",
        }
      )
    })
  }

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-md w-10 h-10 hover:bg-surface-bright/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  )
}
