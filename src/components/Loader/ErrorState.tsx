import React from 'react'

type Props = { message?: string }

export default function ErrorState({ message = 'Failed to load roles. Please try again.' }: Props) {
  return <div className="alert alert-danger mb-3">{message}</div>
}