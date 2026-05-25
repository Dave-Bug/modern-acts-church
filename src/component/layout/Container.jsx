export default function Container({
  children,
  className = "",
}) {
  return (
    <div
      className={`
        w-full
        px-4
        md:px-8
        lg:px-12
        ${className}
      `}
    >
      {children}
    </div>
  );
}