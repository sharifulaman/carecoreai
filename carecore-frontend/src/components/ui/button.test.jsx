import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, buttonVariants } from './button'

describe("Button", () => {
     it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
  })
  it('applies default variants and class sizes', () => {
    render(<Button>Click me</Button>)
    const button=screen.getByRole('button',{name:'Click me'})
    expect(button.className).toContain('text-primary-foreground')
    expect(button.className).toContain('rounded-md')
  })
})