import { Flex, type FlexProps } from "./flex";

export interface HStackProps extends Omit<FlexProps, "direction"> {
  reverse?: boolean;
}

export interface VStackProps extends Omit<FlexProps, "direction"> {
  reverse?: boolean;
}

export function HStack({ reverse = false, ...props }: HStackProps) {
  return <Flex direction={reverse ? "row-reverse" : "row"} {...props} />;
}

export function VStack({ reverse = false, ...props }: VStackProps) {
  return <Flex direction={reverse ? "col-reverse" : "col"} {...props} />;
}
