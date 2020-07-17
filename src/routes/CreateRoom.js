import React from 'react'
import { v1 as uuid } from 'uuid'

const CreateRoom = props => {
  function create () {
    const id = uuid()
    props.history.push(`/room/${id}`)
  }

  return (
    <button onClick={create}>Criar nova sala</button>
  )
}

export default CreateRoom