import { contentModel } from '#/content/model';

export function ContentModel() @{
  <div className="flex w-full flex-col gap-1">
    <h1 className="text-lg font-semibold tracking-tight">{"Model"}</h1>
    <p className="text-sm text-muted-foreground">
      {`${contentModel.length} collections and maps. The client is generated from this.`}
    </p>
  </div>
}
