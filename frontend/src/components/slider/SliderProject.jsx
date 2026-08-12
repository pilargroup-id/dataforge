// PrettoSlider.jsx
import * as React from "react";
import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";

const PrettoSlider = styled(Slider)({
  "--accent-teal": "#2a9d8f",

  color: "var(--accent-teal)",
  height: 8,

  "& .MuiSlider-rail": {
    height: 8,
    borderRadius: 999,
    opacity: 1,
    backgroundColor: "#e5e7eb",
  },

  "& .MuiSlider-track": {
    height: 8,
    border: "none",
    borderRadius: 999,
    background: "linear-gradient(90deg, #2a9d8f 0%, #38c2b2 100%)",
  },

  "& .MuiSlider-thumb": {
    height: 24,
    width: 24,
    backgroundColor: "#fff",
    border: "2px solid var(--accent-teal)",
    boxShadow: "0 4px 12px rgba(42, 157, 143, 0.35)",

    "&:focus, &:hover, &.Mui-active, &.Mui-focusVisible": {
      boxShadow: "0 0 0 8px rgba(42, 157, 143, 0.16)",
    },

    "&::before": {
      display: "none",
    },
  },

  "& .MuiSlider-valueLabel": {
    lineHeight: 1.2,
    fontSize: 12,
    fontWeight: 700,
    background: "unset",
    padding: 0,
    width: 34,
    height: 34,
    borderRadius: "50% 50% 50% 0",
    backgroundImage: "linear-gradient(135deg, #2a9d8f 0%, #38c2b2 100%)",
    color: "#fff",
    transformOrigin: "bottom left",
    transform: "translate(50%, -100%) rotate(-45deg) scale(1)",

    "&::before": {
      display: "none",
    },

    "&.MuiSlider-valueLabelOpen": {
      transform: "translate(50%, -100%) rotate(-45deg) scale(1)",
    },

    "& > *": {
      transform: "rotate(45deg)",
    },
  },
});

export default function PrettoSliderTeal({
  value,
  defaultValue = 20,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  ...props
}) {
  return (
    <PrettoSlider
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      valueLabelDisplay="on"
      aria-label="pretto slider"
      {...props}
    />
  );
}