import React from "react"
import { Stream, converge, plan } from "react-streams"
import { from, merge, of, pipe } from "rxjs"
import { map, mergeScan, scan } from "rxjs/operators"

const StepperControl = ({ min, max, step, ...props }) => {
  const props$ = of({ min, max, step })

  const numFromInput = pipe(map(e => Number(e.target.value)))

  const onUpdateMin = plan(numFromInput)
  const onUpdateMax = plan(numFromInput)
  const onUpdateStep = plan(numFromInput)

  const control$ = merge(
    props$,
    from(onUpdateMin).pipe(map(min => ({ min }))),
    from(onUpdateMax).pipe(map(max => ({ max }))),
    from(onUpdateStep).pipe(map(step => ({ step })))
  ).pipe(
    scan(({ min, max, step }, next) => {
      const diff = max - min
      const updateStep = (step, diff) =>
        step === diff && diff > 1 ? step - 1 : step

      if (next.min) {
        return {
          min: next.min === max ? min : next.min,
          max,
          step: updateStep(step, diff)
        }
      }
      if (next.max) {
        return {
          min,
          max: next.max === min ? max : next.max,
          step: updateStep(step, diff)
        }
      }

      if (next.step) {
        return {
          min,
          max,
          step: next.step === max - min + 1 ? step : next.step
        }
      }

      return {
        min,
        max,
        step
      }
    })
  )

  return (
    <Stream
      source={control$}
      {...{ onUpdateMin, onUpdateMax, onUpdateStep, ...props }}
    />
  )
}

const Stepper = props => {
  //for when you need to compare original props to updated props
  const receiveProps = mergeScan(
    (prevProps, { min, max, step, defaultValue }) => {
      // console.table({
      //   props,
      //   prevProps,
      //   nextProps: { min, max, step, defaultValue }
      // })
      const onDec = plan(
        map(() => ({ value }) => ({
          value: value - step < min ? value : value - step
        }))
      )
      const onInc = plan(
        map(() => ({ value }) => ({
          value: value + step > max ? value : value + step
        }))
      )
      const onChange = plan(
        map(e => Number(e.target.value)),
        map(value => () => ({ value }))
      )

      const onBlur = plan(
        map(e => Number(e.target.value)),
        map(({ value }) => () => ({
          value: Math.min(max, Math.max(min, value))
        }))
      )

      const value = prevProps
        ? Math.max(min, Math.min(max, prevProps.value))
        : defaultValue

      const value$ = converge(
        of({
          value,
          min,
          max,
          step
        }),
        onDec,
        onInc,
        onChange,
        onBlur
      )

      return value$.pipe(
        map(props => ({
          ...props,
          onDec,
          onInc,
          onChange,
          onBlur
        }))
      )
    }
  )

  return <Stream receiveProps={receiveProps} {...props} />
}

export default () => (
  <StepperControl min={10} max={15} step={1}>
    {({ min, max, step, onUpdateMin, onUpdateMax, onUpdateStep }) => (
      <div style={{ padding: "2rem" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>
            min: <input type="number" value={min} onChange={onUpdateMin} />
          </label>
          <label>
            max: <input type="number" value={max} onChange={onUpdateMax} />
          </label>
          <label>
            step: <input type="number" value={step} onChange={onUpdateStep} />
          </label>
        </div>
        <Stepper defaultValue={10} min={min} max={max} step={step}>
          {({ onDec, value, onBlur, onInc, onChange, min, max, step }) => (
            <div>
              <button onClick={onDec} aria-label="Increment value">
                -
              </button>
              <input
                style={{ width: "2rem" }}
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                type="text"
                aria-label="Set value"
              />
              <button onClick={onInc} aria-label="Decrement value">
                +
              </button>
              <br />

              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
              />
            </div>
          )}
        </Stepper>
      </div>
    )}
  </StepperControl>
)