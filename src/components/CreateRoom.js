import React from 'react'
import { v1 as uuidv1 } from 'uuid'

function CreateRoom(props) {

  return (
    <div className="create-room">
      <button
        className="create-room__button"
        onClick={() => props.history.push(`/room/${uuidv1()}`)}
      >
        Criar sala
      </button>
    </div>
  )
}

export default CreateRoom

