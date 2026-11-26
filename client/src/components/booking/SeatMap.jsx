export default function SeatMap({ totalSeats = 40, reserved = [], selected = [], onToggle }) {
  const rows = Math.ceil(totalSeats / 4)

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
      {/* Bus front */}
      <div className="flex justify-center mb-6">
        <div className="bg-burgundy-800 text-white text-xs font-bold px-8 py-2 rounded-t-full">
          🚌 DRIVER
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mb-6 text-xs font-medium">
        {[
          { cls: 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600', label: 'Available' },
          { cls: 'bg-burgundy-800 border-2 border-burgundy-900', label: 'Selected', text: 'text-white' },
          { cls: 'bg-red-100 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 opacity-70', label: 'Reserved' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-md ${cls}`} />
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Seat grid */}
      <div className="flex flex-col gap-2 max-w-xs mx-auto">
        {Array.from({ length: rows }).map((_, rowIdx) => {
          const seatBase = rowIdx * 4
          return (
            <div key={rowIdx} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 text-right">{rowIdx + 1}</span>
              {/* Left pair */}
              <div className="flex gap-1.5">
                {[0, 1].map(offset => {
                  const num = seatBase + offset + 1
                  if (num > totalSeats) return null
                  return <SeatBtn key={num} num={num} reserved={reserved} selected={selected} onToggle={onToggle} />
                })}
              </div>
              {/* Aisle */}
              <div className="flex-1" />
              {/* Right pair */}
              <div className="flex gap-1.5">
                {[2, 3].map(offset => {
                  const num = seatBase + offset + 1
                  if (num > totalSeats) return null
                  return <SeatBtn key={num} num={num} reserved={reserved} selected={selected} onToggle={onToggle} />
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        {selected.length > 0
          ? `Selected: ${selected.join(', ')}`
          : 'Click seats to select'}
      </p>
    </div>
  )
}

function SeatBtn({ num, reserved, selected, onToggle }) {
  const isReserved = reserved.includes(num)
  const isSelected = selected.includes(num)

  let cls = 'seat-available'
  if (isReserved) cls = 'seat-reserved'
  else if (isSelected) cls = 'seat-selected'

  return (
    <button
      type="button"
      onClick={() => !isReserved && onToggle && onToggle(num)}
      className={`w-9 h-9 text-xs font-semibold flex items-center justify-center transition-all duration-150 ${cls}`}
      disabled={isReserved}
      title={isReserved ? 'Reserved' : isSelected ? 'Selected' : 'Available'}
    >
      {num}
    </button>
  )
}
