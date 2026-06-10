import { clsx } from 'clsx'
import { CheckIcon } from '@heroicons/react/24/solid'

interface Step {
  number: number
  label:  string
}

interface StepperProps {
  steps:       Step[]
  currentStep: number
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="w-full">
      {/* Mobile — simple progress bar */}
      <div className="md:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-brand-charcoal">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-xs text-gray-400">
            {steps[currentStep - 1]?.label}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-red rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop — full stepper */}
      <div className="hidden md:flex items-center justify-center mb-10">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number
          const isCurrent   = currentStep === step.number
          const isUpcoming  = currentStep < step.number

          return (
            <div key={step.number} className="flex items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300',
                  isCompleted && 'bg-brand-red text-white',
                  isCurrent   && 'bg-brand-red text-white ring-4 ring-brand-red-light',
                  isUpcoming  && 'bg-gray-100 text-gray-400'
                )}>
                  {isCompleted
                    ? <CheckIcon className="w-4 h-4" />
                    : step.number
                  }
                </div>
                <span className={clsx(
                  'text-xs font-semibold mt-1.5 whitespace-nowrap',
                  isCurrent  && 'text-brand-red',
                  isCompleted && 'text-brand-charcoal',
                  isUpcoming  && 'text-gray-400'
                )}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={clsx(
                  'h-0.5 w-16 lg:w-24 mx-2 mb-5 transition-all duration-300',
                  currentStep > step.number ? 'bg-brand-red' : 'bg-gray-200'
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}