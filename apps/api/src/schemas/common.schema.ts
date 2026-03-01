import { Type } from '@sinclair/typebox'

/** RFC 7807 Problem Details schema */
export const ProblemDetailSchema = Type.Object({
  type: Type.String(),
  title: Type.String(),
  status: Type.Integer(),
  detail: Type.String(),
  instance: Type.String(),
})

/** Cursor pagination response metadata */
export const CursorPaginationSchema = Type.Object({
  cursor: Type.Union([Type.String(), Type.Null()]),
})
