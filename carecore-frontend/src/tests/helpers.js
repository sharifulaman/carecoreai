export const typeInto = async(labelMatcher, value, user)  => {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input, textarea");
  if (!input) {
    // Try finding by label directly
    const label = screen.getByText(labelMatcher, { selector: "label" });
    const parentDiv = label.closest("div");
    const foundInput = parentDiv?.querySelector("input, textarea");
    if (foundInput) {
      await user.clear(foundInput);
      await user.type(foundInput, value);
      return;
    }
    throw new Error(`Could not find input for: ${labelMatcher}`);
  }
  await user.clear(input);
  await user.type(input, value);
}
function getFieldContainer(labelMatcher) {
  try {
    const label = screen.getByText(labelMatcher, { selector: "label" });
    return label.closest("div");
  } catch {
    // Try finding any element containing the text
    const element = screen.getByText(labelMatcher);
    return element.closest("div");
  }
}
export const selectRadixOption = async(labelMatcher, optionText, user) => {
  const container = getFieldContainer(labelMatcher);
  const trigger = within(container).queryByRole("combobox") || within(container).queryByRole("button");
  if (!trigger) {
    // Try finding by text
    const elements = screen.getAllByText(labelMatcher);
    for (const el of elements) {
      const parent = el.closest("div");
      const foundTrigger = parent?.querySelector("[role='combobox'], [role='button']");
      if (foundTrigger) {
        await user.click(foundTrigger);
        break;
      }
    }
  } else {
    await user.click(trigger);
  }

  const option = await screen.findByRole("option", { name: optionText }).catch(() => null);
  if (!option) {
    // Try finding by text
    const optionElement = screen.getByText(optionText);
    await user.click(optionElement);
    return;
  }
  await user.click(option);
}

export const selectDate = async(labelMatcher, dateValue, user) => {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input[type='date']");
  await user.clear(input);
  await user.type(input, dateValue);
}

async function checkCheckbox(user, labelText){
    const label = screen.getByText(labelText);
      const checkbox = label.querySelector('input[type="checkbox"]') || 
                   label.closest('label')?.querySelector('input[type="checkbox"]');
    if(checkbox && !checkbox.checked) {
        await user.click(checkbox);
    }
}

async function typeInto(labelMatcher, value, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input, textarea");
  if (!input) {
    // Try finding by label directly
    const label = screen.getByText(labelMatcher, { selector: "label" });
    const parentDiv = label.closest("div");
    const foundInput = parentDiv?.querySelector("input, textarea");
    if (foundInput) {
      await user.clear(foundInput);
      await user.type(foundInput, value);
      return;
    }
    throw new Error(`Could not find input for: ${labelMatcher}`);
  }
  await user.clear(input);
  await user.type(input, value);
}

export const selectOption = async(labelText, optionText, user) => {
  const select = field(labelText).querySelector("select");
  await user.selectOptions(select, optionText);
}

async function selectDateAndTime(labelMatcher, dateValue, timeValue, user) {
  let container;
  try {
    container = getFieldContainer(labelMatcher);
  } catch {
    container = document.body;
  }

  // 1. Try native separate date/time inputs
  const dateInput = container.querySelector("input[type='date']");
  const timeInput = container.querySelector("input[type='time']");

  if (dateInput || timeInput) {
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: dateValue } });
    }
    if (timeInput) {
      fireEvent.change(timeInput, { target: { value: timeValue } });
    }
    return;
  }

  // 2. Try a single datetime-local input
  const datetimeLocalInput = container.querySelector("input[type='datetime-local']");
  if (datetimeLocalInput) {
    const timeFormatted = timeValue.length === 5 ? timeValue : `${timeValue}:00`;
    const fullValue = `${dateValue}T${timeFormatted}`;
    fireEvent.change(datetimeLocalInput, { target: { value: fullValue } });
    return;
  }

  // 3. Try finding by label
  const label = screen.getByText(labelMatcher, { selector: "label" });
  const parentDiv = label.closest("div");
  const input = parentDiv?.querySelector("input");
  if (input) {
    const timeFormatted = timeValue.length === 5 ? timeValue : `${timeValue}:00`;
    const fullValue = `${dateValue}T${timeFormatted}`;
    fireEvent.change(input, { target: { value: fullValue } });
    return;
  }

  throw new Error(`Could not find date, time, or datetime-local input for: ${labelMatcher}`);
}