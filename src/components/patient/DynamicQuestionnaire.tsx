'use client'

import { useForm, Controller } from 'react-hook-form'
import { questionnaireSchema } from '@/lib/questionnaire-schema'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DynamicQuestionnaireProps {
  onSubmit: (data: Record<string, string>) => void
  isLoading?: boolean
}

type FormValues = Record<string, string>

export default function DynamicQuestionnaire({ onSubmit, isLoading = false }: DynamicQuestionnaireProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>()

  function handleFormSubmit(data: FormValues) {
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {questionnaireSchema.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label
            htmlFor={field.id}
            className="font-body text-body text-dialogue-text"
          >
            {field.label}
          </Label>

          {field.kind === 'textarea' && (
            <Textarea
              id={field.id}
              placeholder="Type here…"
              rows={3}
              className="bg-dialogue-surface border-dialogue-border text-dialogue-text placeholder:text-dialogue-textMuted focus:border-dialogue-accent resize-none"
              {...register(field.id)}
            />
          )}

          {'options' in field && field.kind === 'select' && (
            <Controller
              name={field.id}
              control={control}
              render={({ field: controllerField }) => (
                <Select
                  onValueChange={controllerField.onChange}
                  value={controllerField.value}
                >
                  <SelectTrigger
                    id={field.id}
                    className="bg-dialogue-surface border-dialogue-border text-dialogue-text focus:border-dialogue-accent"
                  >
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent className="bg-dialogue-surface border-dialogue-border">
                    {(field.options as readonly string[]).map((option) => (
                      <SelectItem
                        key={option}
                        value={option}
                        className="text-dialogue-text focus:bg-dialogue-chip"
                      >
                        {option.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}

          {errors[field.id] && (
            <p className="text-red-400 text-xs font-body">This field has an error.</p>
          )}
        </div>
      ))}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-dialogue-accent hover:bg-dialogue-accent/90 text-dialogue-bg font-cta text-cta rounded-button py-4 mt-2 transition-opacity disabled:opacity-50"
      >
        {isLoading ? 'Saving…' : 'Save and continue'}
      </Button>
    </form>
  )
}
