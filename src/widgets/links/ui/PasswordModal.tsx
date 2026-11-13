'use client'

import { Button, FieldError, Input, Label, Modal, TextField } from '@heroui/react'
import { useState } from 'react'

export function PasswordModal({
  title,
  error,
  pending,
  onSubmit,
  onClose,
}: {
  title: string
  error: string | null
  pending: boolean
  onSubmit: (password: string) => void
  onClose: () => void
}) {
  const [password, setPassword] = useState('')

  return (
    <Modal.Backdrop isOpen isDismissable onOpenChange={(open) => !open && onClose()}>
      <Modal.Container placement="center">
        <Modal.Dialog aria-label={`${title} 열기`} className="[--field-background:var(--default)]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (password) onSubmit(password)
            }}
          >
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextField
                type="password"
                value={password}
                onChange={setPassword}
                isInvalid={!!error}
                validationBehavior="aria"
                autoFocus
              >
                <Label>팀 비밀번호</Label>
                <Input autoComplete="current-password" placeholder="팀 비밀번호를 넣어 주세요" />
                <FieldError>{error}</FieldError>
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                닫기
              </Button>
              <Button type="submit" isPending={pending} isDisabled={!password}>
                보기
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
