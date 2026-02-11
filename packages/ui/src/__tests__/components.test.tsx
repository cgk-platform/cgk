import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Input,
  Label,
  Select,
  SelectOption,
  Textarea,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  Spinner,
  Container,
} from '../index'

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('renders with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('Delete')
    expect(btn.className).toContain('destructive')
  })

  it('renders with different sizes', () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-8')
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button').className).toContain('custom-class')
  })
})

describe('Card', () => {
  it('renders Card with children', () => {
    render(<Card data-testid="card">Card content</Card>)
    expect(screen.getByTestId('card')).toHaveTextContent('Card content')
  })

  it('renders full card composition', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">Header</CardHeader>
        <CardContent data-testid="content">Content</CardContent>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </Card>
    )
    expect(screen.getByTestId('header')).toHaveTextContent('Header')
    expect(screen.getByTestId('content')).toHaveTextContent('Content')
    expect(screen.getByTestId('footer')).toHaveTextContent('Footer')
  })
})

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Type here" />)
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument()
  })

  it('supports type prop', () => {
    render(<Input type="email" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')
  })

  it('can be disabled', () => {
    render(<Input disabled data-testid="input" />)
    expect(screen.getByTestId('input')).toBeDisabled()
  })
})

describe('Label', () => {
  it('renders a label element', () => {
    render(<Label>Email</Label>)
    expect(screen.getByText('Email').tagName).toBe('LABEL')
  })

  it('supports htmlFor prop', () => {
    render(<Label htmlFor="email-input">Email</Label>)
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email-input')
  })
})

describe('Select', () => {
  it('renders a select element with options', () => {
    render(
      <Select data-testid="select">
        <SelectOption value="a">Option A</SelectOption>
        <SelectOption value="b">Option B</SelectOption>
      </Select>
    )
    const select = screen.getByTestId('select')
    expect(select.tagName).toBe('SELECT')
    expect(select.querySelectorAll('option')).toHaveLength(2)
  })

  it('supports error variant', () => {
    render(
      <Select variant="error" data-testid="select">
        <SelectOption value="a">A</SelectOption>
      </Select>
    )
    expect(screen.getByTestId('select').className).toContain('destructive')
  })
})

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea placeholder="Write here" />)
    expect(screen.getByPlaceholderText('Write here').tagName).toBe('TEXTAREA')
  })

  it('can be disabled', () => {
    render(<Textarea disabled data-testid="ta" />)
    expect(screen.getByTestId('ta')).toBeDisabled()
  })
})

describe('Alert', () => {
  it('renders with default variant', () => {
    render(<Alert>Default alert</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Default alert')
  })

  it('renders with info variant', () => {
    render(<Alert variant="info">Info alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('blue')
  })

  it('renders with success variant', () => {
    render(<Alert variant="success">Success!</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('green')
  })

  it('renders with warning variant', () => {
    render(<Alert variant="warning">Warning!</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('yellow')
  })

  it('renders with error variant', () => {
    render(<Alert variant="error">Error!</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('red')
  })

  it('renders AlertTitle and AlertDescription', () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
        <AlertDescription>Description</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('renders with success variant', () => {
    render(<Badge variant="success">Active</Badge>)
    expect(screen.getByText('Active').className).toContain('green')
  })

  it('renders with warning variant', () => {
    render(<Badge variant="warning">Pending</Badge>)
    expect(screen.getByText('Pending').className).toContain('yellow')
  })

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Deleted</Badge>)
    expect(screen.getByText('Deleted').className).toContain('destructive')
  })
})

describe('Spinner', () => {
  it('renders an SVG element', () => {
    render(<Spinner data-testid="spinner" />)
    expect(screen.getByTestId('spinner').tagName).toBe('svg')
  })

  it('applies size variant', () => {
    render(<Spinner size="lg" data-testid="spinner" />)
    const spinner = screen.getByTestId('spinner')
    const classes = spinner.getAttribute('class') ?? ''
    expect(classes).toContain('h-8')
    expect(classes).toContain('w-8')
  })

  it('has animation class', () => {
    render(<Spinner data-testid="spinner" />)
    const classes = screen.getByTestId('spinner').getAttribute('class') ?? ''
    expect(classes).toContain('animate-spin')
  })
})

describe('Container', () => {
  it('renders with default size', () => {
    render(<Container data-testid="container">Content</Container>)
    const container = screen.getByTestId('container')
    expect(container).toHaveTextContent('Content')
    expect(container.className).toContain('max-w-screen-lg')
  })

  it('renders with sm size', () => {
    render(<Container size="sm" data-testid="container">Content</Container>)
    expect(screen.getByTestId('container').className).toContain('max-w-screen-sm')
  })
})
