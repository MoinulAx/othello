import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// Helper function to get valid moves
function getValidMoves(board: (string | null)[][], currentPlayer: string) {
  const validMoves: {row: number; col: number}[] = []
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ]

  const isValidMove = (row: number, col: number) => {
    if (row < 0 || row >= 8 || col < 0 || col >= 8 || board[row][col] !== null) {
      return false
    }

    for (const [dx, dy] of directions) {
      let x = row + dx
      let y = col + dy
      let foundOpponent = false

      while (x >= 0 && x < 8 && y >= 0 && y < 8) {
        if (board[x][y] === (currentPlayer === 'B' ? 'W' : 'B')) {
          foundOpponent = true
        } else if (board[x][y] === currentPlayer && foundOpponent) {
          return true
        } else {
          break
        }
        x += dx
        y += dy
      }
    }
    return false
  }

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (isValidMove(row, col)) {
        validMoves.push({row, col})
      }
    }
  }

  return validMoves
}

export async function getAIMove(board: (string | null)[][], currentPlayer: string) {
  try {
    const validMoves = getValidMoves(board, currentPlayer)

    if (validMoves.length === 0) {
      console.log('No valid moves available for AI')
      return null
    }

    const boardState = JSON.stringify(board)
    const validMovesStr = JSON.stringify(validMoves)

    const prompt = `You are playing Othello/Reversi as the ${currentPlayer} player (${
      currentPlayer === 'B' ? 'Black' : 'White'
    } pieces).

Current board state (null represents empty squares):
${boardState}

VALID MOVES AVAILABLE:
${validMovesStr}

Choose one move from the valid moves list provided above. Return ONLY a JSON object with row and column indices matching one of the valid moves. Example response: {"row": 2, "col": 3}

Your response must be exactly one of the valid moves listed above.`

    const msg = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{role: 'user', content: prompt}],
    })
    // @ts-expect-error TODO: fix this
    const response = JSON.parse(msg.content[0].text)

    // Verify that the AI's move is in the valid moves list
    const isValidAIMove = validMoves.some((move) => move.row === response.row && move.col === response.col)

    if (!isValidAIMove) {
      console.error('AI returned invalid move:', response)
      // If AI somehow returns an invalid move, choose the first valid move instead
      return validMoves[0]
    }

    console.log('AI chose valid move:', response)
    return response
  } catch (error) {
    console.error('Error getting AI move:', error)
    return null
  }
}
